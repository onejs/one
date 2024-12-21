import babel from '@babel/core';
export async function transformFlowBabel(input, { development = false } = {}) {
    return await new Promise((res, rej) => {
        babel.transform(input, {
            presets: [
                [
                    'module:metro-react-native-babel-preset',
                    {
                        // To use the `@babel/plugin-transform-react-jsx` plugin for JSX.
                        useTransformReactJSXExperimental: true,
                        unstable_transformProfile: 'hermes-stable',
                    },
                ],
            ],
            plugins: [
                ['@babel/plugin-transform-react-jsx', { development }],
                ['@babel/plugin-transform-private-methods', { loose: true }],
            ],
        }, (err, result) => {
            if (!result || err)
                rej(err || 'no res');
            res(result.code);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtRmxvd0JhYmVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJhbnNmb3JtRmxvd0JhYmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLGFBQWEsQ0FBQTtBQUUvQixNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUN0QyxLQUFhLEVBQ2IsRUFBRSxXQUFXLEdBQUcsS0FBSyxLQUFnQyxFQUFFO0lBRXZELE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUM1QyxLQUFLLENBQUMsU0FBUyxDQUNiLEtBQUssRUFDTDtZQUNFLE9BQU8sRUFBRTtnQkFDUDtvQkFDRSx3Q0FBd0M7b0JBQ3hDO3dCQUNFLGlFQUFpRTt3QkFDakUsZ0NBQWdDLEVBQUUsSUFBSTt3QkFDdEMseUJBQXlCLEVBQUUsZUFBZTtxQkFDM0M7aUJBQ0Y7YUFDRjtZQUNELE9BQU8sRUFBRTtnQkFDUCxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ3RELENBQUMseUNBQXlDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDN0Q7U0FDRixFQUNELENBQUMsR0FBUSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ25CLElBQUksQ0FBQyxNQUFNLElBQUksR0FBRztnQkFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFBO1lBQ3hDLEdBQUcsQ0FBQyxNQUFPLENBQUMsSUFBSyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMifQ==