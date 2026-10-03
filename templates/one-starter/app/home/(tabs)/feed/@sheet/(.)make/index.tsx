// soft navigation: the (.) prefix intercepts pushes to /home/feed/make and
// renders the route's own dialog over the feed. this file is only the
// intercept address; the dialog lives in ../../make, so soft and hard
// navigations can never drift apart.
export { default } from '../../make'
