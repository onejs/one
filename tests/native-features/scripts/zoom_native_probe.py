# observes the native UIKit callbacks without adding a public runtime seam.
import json
import os
import struct
import lldb

_events = os.path.join(os.path.dirname(__file__), 'zoom-native-events.jsonl')
_pending = {}
_kinds = {}


def emit(value):
    with open(_events, 'a') as output:
        output.write(json.dumps(value) + '\n')


def objc(frame, code):
    options = lldb.SBExpressionOptions()
    options.SetLanguage(lldb.eLanguageTypeObjC)
    options.SetIgnoreBreakpoints(True)
    options.SetTimeoutInMicroSeconds(2000000)
    result = frame.EvaluateExpression(code, options)
    if result.GetError().Fail():
        raise RuntimeError(result.GetError().GetCString())
    return result.GetObjectDescription()


def stopped(location):
    # lldb can hand a callback the previous stop's frame, whose thread no longer
    # reaches the target, and keep that stop's cached pc; resolve the stopped
    # thread from the breakpoint and trust only its live registers.
    breakpoint = location.GetBreakpoint()
    for thread in breakpoint.GetTarget().GetProcess():
        if (thread.GetStopReason() == lldb.eStopReasonBreakpoint
                and thread.GetStopReasonDataAtIndex(0) == breakpoint.GetID()):
            frame = thread.GetFrameAtIndex(0)
            if frame.FindRegister('pc').GetValueAsUnsigned() != location.GetLoadAddress():
                raise RuntimeError('native callback frame does not match its breakpoint')
            return frame
    raise RuntimeError('no thread stopped at the native callback breakpoint')


def returned(_, location, __):
    try:
        frame = stopped(location)
        breakpoint = location.GetBreakpoint()
        breakpoint.SetEnabled(False)
        item = _pending.pop(breakpoint.GetID(), None)
        if item is None:
            return False
        event = {'kind': item['kind'], 'identifier': item['identifier']}
        if item['kind'] == 'alignment':
            error = lldb.SBError()
            raw = frame.GetThread().GetProcess().ReadMemory(item['result'], 33, error)
            if error.Fail() or len(raw) != 33:
                raise RuntimeError('cannot read alignment callback result')
            event['rect'] = None if raw[32] else list(struct.unpack('<dddd', raw[:32]))
        else:
            address = frame.FindRegister('x0').GetValueAsUnsigned()
            event['view'] = hex(address)
            if address:
                event['testID'] = objc(frame, '(id)[(id)' + str(address) + ' accessibilityIdentifier]')
                event['mounted'] = objc(frame, '(id)[(id)' + str(address) + ' window]') is not None
                event['bounds'] = objc(frame, '(id)NSStringFromCGRect([(UIView *)' + str(address) + ' bounds])')
        emit(event)
    except Exception as error:
        emit({'error': str(error)})
    return False


def entered(_, location, __):
    try:
        frame = stopped(location)
        kind = _kinds[location.GetBreakpoint().GetID()]
        # arm64 Swift passes this closure's captured enabler in x1. CGRect?
        # uses the indirect result pointer in x8; source UIView? returns in x0.
        # read them before evaluating anything, which resumes the thread.
        enabler = frame.FindRegister('x1').GetValueAsUnsigned()
        result = frame.FindRegister('x8').GetValueAsUnsigned()
        caller = frame.FindRegister('lr').GetValueAsUnsigned()
        thread = frame.GetThread().GetThreadID()
        identifier = objc(frame, '(id)[(id)' + str(enabler) + ' zoomTransitionSourceIdentifier]')
        breakpoint = location.GetBreakpoint().GetTarget().BreakpointCreateByAddress(caller)
        if not breakpoint.IsValid() or not caller:
            raise RuntimeError('cannot observe the native ' + kind + ' callback return')
        breakpoint.SetOneShot(True)
        breakpoint.SetThreadID(thread)
        breakpoint.SetScriptCallbackFunction(__name__ + '.returned')
        _pending[breakpoint.GetID()] = {'kind': kind, 'identifier': identifier, 'result': result}
    except Exception as error:
        emit({'error': str(error)})
    return False


def __lldb_init_module(debugger, _):
    target = debugger.GetSelectedTarget()
    if 'arm64' not in target.GetTriple():
        raise RuntimeError('zoom native probe requires arm64')
    # One links into the app bundle; searching the runtime's system images too
    # spends most of the attach budget on a loaded simulator app.
    bundle = os.path.dirname(target.GetExecutable().fullpath) + '/'
    modules = lldb.SBFileSpecList()
    for module in target.module_iter():
        if module.GetFileSpec().fullpath.startswith(bundle):
            modules.Append(module.GetFileSpec())
    for kind, context in [('alignment', 'AlignmentRectContext'), ('source', 'SourceViewProviderContext')]:
        breakpoint = target.BreakpointCreateByRegex(
            '^closure #[13] .*UIZoomTransition' + context + '.*One.ZoomTransitionEnablerView.setupZoomTransition',
            modules,
            lldb.SBFileSpecList(),
        )
        if breakpoint.GetNumLocations() != 1:
            raise RuntimeError('expected one native ' + kind + ' callback')
        breakpoint.SetScriptCallbackFunction(__name__ + '.entered')
        _kinds[breakpoint.GetID()] = kind
    emit({'probe': 'ready', 'architecture': target.GetTriple()})
