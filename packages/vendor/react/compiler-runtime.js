/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict'

// @nate: i just inlined things here since it wasnt bundling the require()

if (process.env.NODE_ENV === 'production') {
  var ReactSharedInternals =
    require('react').__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
  exports.c = function (size) {
    return ReactSharedInternals.H.useMemoCache(size)
  }
} else {
  var ReactSharedInternals =
    require('react').__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
  exports.c = function (size) {
    var dispatcher = ReactSharedInternals.H
    null === dispatcher &&
      console.error(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.'
      )
    return dispatcher.useMemoCache(size)
  }
}
