# observes the first actual native mount before asynchronous gpu work changes its labels.
import json
import os
import lldb

_events = os.path.join(os.path.dirname(__file__), 'gpu-native-mounts.jsonl')


def emit(value):
    with open(_events, 'a') as output:
        output.write(json.dumps(value) + '\n')


def mounted(frame, location, _):
    try:
        options = lldb.SBExpressionOptions()
        options.SetLanguage(lldb.eLanguageTypeObjC_plus_plus)
        options.SetIgnoreBreakpoints(True)
        options.SetTimeoutInMicroSeconds(2000000)
        code = r'''(id)({
          NSMutableArray *todo = [NSMutableArray arrayWithArray:
            [(UIApplication *)[(id)objc_getClass("UIApplication") sharedApplication] windows]];
          NSMutableArray *found = [NSMutableArray new];
          for (NSUInteger i = 0; i < [todo count]; i++) {
            UIView *view = (UIView *)[todo objectAtIndex:i];
            [todo addObjectsFromArray:[view subviews]];
            NSString *identifier = [view accessibilityIdentifier];
            if ([identifier hasPrefix:@"one-native-gpu"]) {
              [found addObject:@{
                @"id": identifier, @"label": [view accessibilityLabel] ?: @"",
                @"mounted": @([view window] != nil),
                @"class": NSStringFromClass([view class]),
                @"bounds": NSStringFromCGRect([view bounds])
              }];
            }
          }
          [[NSString alloc] initWithData:
            [NSJSONSerialization dataWithJSONObject:found options:0 error:nil]
            encoding:NSUTF8StringEncoding];
        })'''
        value = frame.EvaluateExpression(code, options)
        if value.GetError().Fail():
            raise RuntimeError(value.GetError().GetCString())
        nodes = json.loads(value.GetObjectDescription() or '[]')
        if any(node['id'] == 'one-native-gpu-screen' for node in nodes):
            emit({'kind': 'mounted', 'nodes': nodes})
            location.GetBreakpoint().SetEnabled(False)
    except Exception as error:
        emit({'error': str(error)})
        location.GetBreakpoint().SetEnabled(False)
    return False


def __lldb_init_module(debugger, _):
    target = debugger.GetSelectedTarget()
    breakpoint = target.BreakpointCreateByName(
        '-[RCTSurfacePresenter mountingManager:didMountComponentsWithRootTag:]'
    )
    if breakpoint.GetNumLocations() != 1:
        raise RuntimeError('expected one native mounting callback')
    breakpoint.SetScriptCallbackFunction(__name__ + '.mounted')
    emit({'probe': 'ready', 'architecture': target.GetTriple()})
