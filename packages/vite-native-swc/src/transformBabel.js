import babel from '@babel/core';
/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
export async function transformGenerators(input, { development = false } = {}) {
    return await new Promise((res, rej) => {
        babel.transform(input, {
            filename: 'code.js',
            plugins: [
                ['@babel/plugin-transform-destructuring'],
                ['@babel/plugin-transform-react-jsx', { development }],
                ['@babel/plugin-transform-async-generator-functions'],
                ['@babel/plugin-transform-async-to-generator'],
                [
                    '@babel/plugin-transform-runtime',
                    {
                        helpers: true,
                        rengerator: false,
                    },
                ],
            ],
            compact: false,
            minified: false,
        }, (err, result) => {
            if (!result || err)
                rej(err || 'no res');
            res(result.code);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtQmFiZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cmFuc2Zvcm1CYWJlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssTUFBTSxhQUFhLENBQUE7QUFFL0I7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN2QyxLQUFhLEVBQ2IsRUFBRSxXQUFXLEdBQUcsS0FBSyxLQUFnQyxFQUFFO0lBRXZELE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUM1QyxLQUFLLENBQUMsU0FBUyxDQUNiLEtBQUssRUFDTDtZQUNFLFFBQVEsRUFBRSxTQUFTO1lBQ25CLE9BQU8sRUFBRTtnQkFDUCxDQUFDLHVDQUF1QyxDQUFDO2dCQUN6QyxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ3RELENBQUMsbURBQW1ELENBQUM7Z0JBQ3JELENBQUMsNENBQTRDLENBQUM7Z0JBQzlDO29CQUNFLGlDQUFpQztvQkFDakM7d0JBQ0UsT0FBTyxFQUFFLElBQUk7d0JBQ2IsVUFBVSxFQUFFLEtBQUs7cUJBQ2xCO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLEVBQUUsS0FBSztZQUNkLFFBQVEsRUFBRSxLQUFLO1NBQ2hCLEVBQ0QsQ0FBQyxHQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDbkIsSUFBSSxDQUFDLE1BQU0sSUFBSSxHQUFHO2dCQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLENBQUE7WUFFeEMsR0FBRyxDQUFDLE1BQU8sQ0FBQyxJQUFLLENBQUMsQ0FBQTtRQUNwQixDQUFDLENBQ0YsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyJ9