function useNetworkState() {
	_s$26();
	var [state, setState] = (0, import_react$69.useState)({
		type: "unknown",
		isConnected: false,
		isInternetReachable: false
	});
	(0, import_react$69.useEffect)(() => {
		var active = true;
		var sawEvent = false;
		getState$1().then((next) => {
			if (active && !sawEvent) setState(next);
		}).catch(() => {});
		var subscription = addStateListener((next) => {
			sawEvent = true;
			if (active) setState(next);
		});
		return () => {
			active = false;
			subscription.remove();
		};
	}, []);
	return state;
}
