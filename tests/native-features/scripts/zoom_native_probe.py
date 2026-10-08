# observes the native UIKit callbacks without adding a public runtime seam.
import json
import os
import struct
import lldb

_events = os.path.join(os.path.dirname(__file__), 'zoom-native-events.jsonl')
_pending = {}


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


def returned(frame, location, _):
    try:
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


def entered(frame, location, _):
    try:
        kind = 'alignment' if 'AlignmentRectContext' in frame.GetFunctionName() else 'source'
        # arm64 Swift passes this closure's captured enabler in x1. CGRect?
        # uses the indirect result pointer in x8; source UIView? returns in x0.
        enabler = frame.FindRegister('x1').GetValueAsUnsigned()
        identifier = objc(frame, '(id)[(id)' + str(enabler) + ' zoomTransitionSourceIdentifier]')
        target = frame.GetThread().GetProcess().GetTarget()
        breakpoint = target.BreakpointCreateByAddress(frame.FindRegister('lr').GetValueAsUnsigned())
        breakpoint.SetOneShot(True)
        breakpoint.SetThreadID(frame.GetThread().GetThreadID())
        breakpoint.SetScriptCallbackFunction(__name__ + '.returned')
        _pending[breakpoint.GetID()] = {
            'kind': kind, 'identifier': identifier,
            'result': frame.FindRegister('x8').GetValueAsUnsigned(),
        }
    except Exception as error:
        emit({'error': str(error)})
    return False


def __lldb_init_module(debugger, _):
    target = debugger.GetSelectedTarget()
    if 'arm64' not in target.GetTriple():
        raise RuntimeError('zoom native probe requires arm64')
    for kind, context in [('alignment', 'AlignmentRectContext'), ('source', 'SourceViewProviderContext')]:
        breakpoint = target.BreakpointCreateByRegex(
            '^closure #[13] .*UIZoomTransition' + context + '.*One.ZoomTransitionEnablerView.setupZoomTransition'
        )
        if breakpoint.GetNumLocations() != 1:
            raise RuntimeError('expected one native ' + kind + ' callback')
        breakpoint.SetScriptCallbackFunction(__name__ + '.entered')
    emit({'probe': 'ready', 'architecture': target.GetTriple()})
