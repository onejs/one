/// <reference path="./.sst/platform/config.d.ts" />

import { buildChatAppDocker } from './src/ci/buildChatAppDocker'

import { readFileSync } from 'node:fs'

export default $config({
  app(input) {
    // Load .env file
    require('dotenv').config()

    return {
      name: 'start-chat',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'us-west-1',
          profile: input.stage === 'production' ? 'tamagui-prod' : 'tamagui-dev',
        },
      },
    }
  },

  async run() {
    // Load .env file
    require('dotenv').config()

    new sst.Secret('GITHUB_TOKEN', process.env.GITHUB_TOKEN)

    const chatAppImage = `ghcr.io/onejs/one/chat-app:latest` //await buildChatAppDocker()

    // const schemaJson = readFileSync('./src/zero/zero-schema.json', 'utf-8').replaceAll(/\s/g, '')

    // S3 Bucket
    // const replicationBucket = new sst.aws.Bucket(`replication-bucket`)

    // VPC Configuration
    const vpc = new sst.aws.Vpc(`vpc`, {
      transform: {
        securityGroup: {
          ingress: [
            {
              description: 'Allow HTTP traffic',
              protocol: 'tcp',
              fromPort: 80,
              toPort: 80,
              cidrBlocks: ['0.0.0.0/0'],
            },
            {
              description: 'Allow traffic to Chat app',
              protocol: 'tcp',
              fromPort: 3000,
              toPort: 3000,
              cidrBlocks: ['0.0.0.0/0'],
            },
            {
              description: 'Allow traffic to ZeroCache service',
              protocol: 'tcp',
              fromPort: 4848,
              toPort: 4848,
              cidrBlocks: ['0.0.0.0/0'],
            },
            {
              description: 'Allow traffic to ZeroCache Heartbeat',
              protocol: 'tcp',
              fromPort: 4850,
              toPort: 4850,
              cidrBlocks: ['0.0.0.0/0'],
            },
          ],
        },
      },
    })

    // // ECS Cluster
    const cluster = new sst.aws.Cluster(`cluster`, {
      vpc,
    })

    // Web App
    cluster.addService(`chat-app`, {
      image: chatAppImage,
      cpu: '2 vCPU',
      memory: '8 GB',

      scaling: {
        min: 1,
        max: 2,
      },

      // link: [replicationBucket],
      environment: {
        ONE_SERVER_URL: 'https://start.chat',
      },

      health: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
        interval: '5 seconds',
        retries: 3,
        startPeriod: '300 seconds',
      },

      serviceRegistry: {
        port: 3000,
      },

      loadBalancer: {
        public: true,
        rules: [
          {
            listen: '80/http',
            forward: '3000/http',
          },
        ],
      },
    })

    // Database
    // const db = new sst.aws.Postgres(`postgres`, {
    //   vpc,
    //   transform: {
    //     parameterGroup: {
    //       parameters: [
    //         {
    //           name: 'rds.logical_replication',
    //           value: '1',
    //           applyMethod: 'pending-reboot',
    //         },
    //         {
    //           name: 'rds.force_ssl',
    //           value: '0',
    //           applyMethod: 'pending-reboot',
    //         },
    //         {
    //           name: 'max_connections',
    //           value: '1000',
    //           applyMethod: 'pending-reboot',
    //         },
    //         ...($app.stage === 'production'
    //           ? []
    //           : [
    //               {
    //                 name: 'max_slot_wal_keep_size',
    //                 value: '1024',
    //               },
    //             ]),
    //       ],
    //     },
    //   },
    // })

    // const connection = $interpolate`postgres://${db.username}:${db.password}@${db.host}:${db.port}`
    // const upstreamDbConnection = $interpolate`${connection}/${db.database}`

    // // Common environment variables
    // const commonEnv = {
    //   AWS_REGION: process.env.AWS_REGION!,
    //   ZERO_UPSTREAM_DB: upstreamDbConnection,
    //   ZERO_CVR_DB: $interpolate`${connection}/zero_cvr`,
    //   ZERO_CHANGE_DB: $interpolate`${connection}/zero_change`,
    //   ZERO_SCHEMA_JSON: schemaJson,
    //   ZERO_LOG_FORMAT: 'json',
    //   ZERO_REPLICA_FILE: 'sync-replica.db',
    //   ZERO_LITESTREAM_BACKUP_URL: `s3://${replicationBucket.name}/backup`,
    // }

    // // View Syncer Service
    // const zeroService = cluster.addService(`zero`, {
    //   cpu: '2 vCPU',
    //   memory: '8 GB',
    //   image: 'rocicorp/zero',
    //   health: {
    //     command: ['CMD-SHELL', 'curl -f http://localhost:4848/ || exit 1'],
    //     interval: '5 seconds',
    //     retries: 3,
    //     startPeriod: '300 seconds',
    //   },
    //   environment: {
    //     ...commonEnv,
    //     ZERO_CHANGE_STREAMER_URI: `ws://change-streamer.chat:4849`,
    //     ZERO_UPSTREAM_MAX_CONNS: '15',
    //     ZERO_CVR_MAX_CONNS: '160',
    //   },
    //   logging: {
    //     retention: '1 month',
    //   },
    //   loadBalancer: {
    //     public: true,
    //     rules: [
    //       {
    //         listen: '80/http',
    //         forward: '4848/http',
    //       },
    //       {
    //         listen: '4850/http',
    //       },
    //     ],
    //     health: {
    //       '4850/http': {
    //         path: '/',
    //         interval: '5 seconds',
    //         unhealthyThreshold: 2,
    //         healthyThreshold: 3,
    //         timeout: '3 seconds',
    //       },
    //     },
    //   },
    //   serviceRegistry: {
    //     port: 4848,
    //   },
    //   transform: {
    //     target: {
    //       healthCheck: {
    //         enabled: true,
    //         path: '/',
    //         protocol: 'HTTP',
    //       },
    //       stickiness: {
    //         enabled: true,
    //         type: 'lb_cookie',
    //       },
    //       loadBalancingAlgorithmType: 'least_outstanding_requests',
    //     },
    //     autoScalingTarget: {
    //       minCapacity: 1,
    //       maxCapacity: 10,
    //     },
    //   },
    // })

    // cluster.addService(`replication-manager`, {
    //   cpu: '2 vCPU',
    //   memory: '8 GB',
    //   image: 'rocicorp/zero',
    //   health: {
    //     command: ['CMD-SHELL', 'curl -f http://localhost:4849/ || exit 1'],
    //     interval: '5 seconds',
    //     retries: 3,
    //     startPeriod: '300 seconds',
    //   },
    //   environment: {
    //     ...commonEnv,
    //     ZERO_CHANGE_MAX_CONNS: '3',
    //     ZERO_NUM_SYNC_WORKERS: '0',
    //   },
    //   logging: {
    //     retention: '1 month',
    //   },
    //   serviceRegistry: {
    //     port: 4849,
    //   },
    // })

    // new sst.aws.StaticSite('Web', {
    //   path: '.',
    //   build: {
    //     command: 'yarn build:web',
    //     output: 'dist',
    //   },
    //   environment: {
    //     ZERO_AUTH_SECRET: 'secretkey',
    //     VITE_ZERO_CACHE_URL: zeroService.url,
    //   },
    // })
  },
})
