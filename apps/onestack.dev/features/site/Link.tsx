import { Text } from "tamagui";
import { useLinkTo, type Href, type LinkProps as OneLinkProps } from "one";

export type LinkProps = OneLinkProps<Href>;

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace });

  return (
    <Text
      tag="a"
      // @ts-ignore
      fontFamily="inherit"
      // always except-style
      asChild={asChild ? "except-style" : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      fontSize="inherit"
      lineHeight="inherit"
      textDecorationColor="$color04"
      hoverStyle={{
        color: "$color12",
        textDecorationColor: "$color12",
      }}
      {...props}
      {...(linkProps as any)}
    />
  );
};
