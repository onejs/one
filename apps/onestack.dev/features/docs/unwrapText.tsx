import React from 'react'

export function unwrapText(children: any) {
  return React.Children.toArray(children).map((x) => {
    // code blocks need their expressive-code wrapper for styling
    // @ts-ignore
    if (x?.props?.className === 'expressive-code') return x
    // @ts-ignore
    return x?.props?.children ? x.props.children : x
  })
}
