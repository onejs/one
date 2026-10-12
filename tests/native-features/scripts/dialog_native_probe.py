# observes the owning controlled acknowledgement and UIKit's actual alert lifecycle.
import json
import os
import lldb

_events = os.path.join(os.path.dirname(__file__), 'dialog-native-events.jsonl')


def emit(value):
    with open(_events, 'a') as output:
        output.write(json.dumps(value) + '\n')


def objc(frame, code):
    options = lldb.SBExpressionOptions()
    options.SetLanguage(lldb.eLanguageTypeObjC_plus_plus)
    options.SetIgnoreBreakpoints(True)
    options.SetTimeoutInMicroSeconds(2000000)
    result = frame.EvaluateExpression(code, options)
    if result.GetError().Fail():
        raise RuntimeError(result.GetError().GetCString())
    return result.GetObjectDescription()


def entered(frame, location, _):
    try:
        name = frame.GetFunctionName()
        reg = lambda key: frame.FindRegister(key).GetValueAsUnsigned()
        if 'OneNativeAlertView.configure' in name:
            emit({'kind': 'configure', 'host': hex(reg('x0')), 'value': bool(reg('x2')),
                  'acknowledged': reg('x3'), 'revision': reg('x4')})
        elif 'block_invoke.2' in name:
            emit({'kind': 'change', 'value': bool(reg('x1')), 'count': reg('x2'),
                  'revision': reg('x3')})
        elif 'block_invoke.4' in name:
            emit({'kind': 'action', 'id': objc(frame, '(id)' + str(reg('x1'))),
                  'presenting': objc(frame, '(id)' + str(reg('x2'))), 'count': reg('x3')})
        elif 'viewDid' in name:
            address = reg('x0')
            controller = '(id)' + str(address)
            klass = objc(frame, '(id)NSStringFromClass((Class)[(id)' + str(address) + ' class])')
            if klass != 'SwiftUI.PlatformAlertController':
                return False
            title = objc(frame, '(id)[' + controller + ' title]')
            live = objc(frame, '(id)(((id)[' + controller + ' presentingViewController] != (id)0 && ' +
                        '(id)[(id)[' + controller + ' presentingViewController] presentedViewController] == ' + controller +
                        ' && (id)[(id)[' + controller + ' view] window] != (id)0 && !(BOOL)[' + controller + ' isBeingDismissed]) ? @"live" : @"absent")')
            emit({'kind': 'appeared' if 'viewDidAppear' in name else 'disappeared',
                  'controller': hex(address), 'class': klass, 'title': title, 'live': live == 'live'})
    except Exception as error:
        emit({'error': str(error)})
    return False


def __lldb_init_module(debugger, _):
    emit({'probe': 'starting'})
    target = debugger.GetSelectedTarget()
    if 'arm64' not in target.GetTriple():
        raise RuntimeError('dialog native probe requires arm64')
    owners = target.FindSymbols('__45-[OneNativeAlertComponentView initWithFrame:]_block_invoke.2')
    if owners.GetSize() != 1:
        raise RuntimeError('expected one owning Alert bridge image')
    module = owners.GetContextAtIndex(0).GetModule().GetFileSpec().GetFilename()
    for regex, count in [
        ('^@objc One.OneNativeAlertView.configure\\(', 1),
        ('OneNativeAlertComponentView initWithFrame.*block_invoke', 3),
    ]:
        breakpoint = target.BreakpointCreateByRegex(regex, module)
        emit({'setup': regex, 'locations': breakpoint.GetNumLocations()})
        if breakpoint.GetNumLocations() != count:
            raise RuntimeError('unexpected native dialog callback locations: ' + regex)
        breakpoint.SetScriptCallbackFunction(__name__ + '.entered')
    for name in ['-[UIViewController viewDidAppear:]', '-[UIViewController viewDidDisappear:]']:
        breakpoint = target.BreakpointCreateByName(name)
        if breakpoint.GetNumLocations() != 1:
            raise RuntimeError('expected one UIKit lifecycle callback: ' + name)
        breakpoint.SetScriptCallbackFunction(__name__ + '.entered')
    emit({'probe': 'ready', 'architecture': target.GetTriple()})
