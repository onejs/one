/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'chat',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    }
  },
  //   async run() {
  //     const vpc = new sst.aws.Vpc('Vpc', {
  //       bastion: true,
  //     })

  //     const db = new sst.aws.Postgres('Database', {
  //       vpc,
  //       // 論理レプリケーションなどの設定
  //       transform: {
  //         parameterGroup: {
  //           parameters: [
  //             {
  //               name: 'rds.logical_replication',
  //               value: '1',
  //               applyMethod: 'pending-reboot',
  //             },
  //             {
  //               name: 'rds.force_ssl',
  //               value: '0',
  //               applyMethod: 'pending-reboot',
  //             },
  //             {
  //               name: 'max_connections',
  //               value: '1000',
  //               applyMethod: 'pending-reboot',
  //             },
  //           ],
  //         },
  //       },
  //     })

  //     const connection = $interpolate`postgres://${db.username}:${db.password}@${db.host}:${db.port}`

  //     return {
  //       databaseUrl: connection,
  //     }
  //   },
  async run() {},
})
