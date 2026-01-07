let lastUserRouteAction = Date.now();

export const getLastAction = () => lastUserRouteAction;
export const setLastAction = () => {
  lastUserRouteAction = Date.now();
};
