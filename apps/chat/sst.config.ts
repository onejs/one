/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    // Load .env file
    require('dotenv').config()

    return {
      name: 'aws-zero',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',

      providers: {
        aws: {
          profile: input.stage === 'production' ? 'tamagui-prod' : 'tamagui-dev',
        },
      },
    }
  },
  async run() {
    // Load .env file
    require('dotenv').config()

    // Config parameters
    const namespace = process.env.DEPLOY_NAMESPACE!
    const upstreamDb = process.env.ZERO_UPSTREAM_DB!
    const cvrDb = process.env.ZERO_CVR_DB!
    const changeDb = process.env.ZERO_CHANGE_DB!
    const schemaJson = process.env.ZERO_SCHEMA_JSON!

    // S3 Bucket
    const replicationBucket = new sst.aws.Bucket(`${namespace}-replication-bucket`)

    // VPC Configuration
    const vpc = new sst.aws.Vpc(`${namespace}-vpc`, {
      az: 2,
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

    // ECS Cluster
    const cluster = new sst.aws.Cluster(`${namespace}-cluster`, {
      vpc,
    })

    // Common environment variables
    const commonEnv = {
      AWS_REGION: process.env.AWS_REGION!,
      ZERO_UPSTREAM_DB: upstreamDb,
      ZERO_CVR_DB: cvrDb,
      ZERO_CHANGE_DB: changeDb,
      ZERO_SCHEMA_JSON: schemaJson,
      ZERO_LOG_FORMAT: 'json',
      ZERO_REPLICA_FILE: 'sync-replica.db',
      ZERO_LITESTREAM_BACKUP_URL: `s3://${replicationBucket.name}/backup`,
    }

    // View Syncer Service
    cluster.addService(`${namespace}-view-syncer`, {
      cpu: '2 vCPU',
      memory: '8 GB',
      image: 'rocicorp/zero:canary',
      health: {
        command: ['CMD-SHELL', 'curl -f http://localhost:4848/ || exit 1'],
        interval: '5 seconds',
        retries: 3,
        startPeriod: '300 seconds',
      },
      environment: {
        ...commonEnv,
        ZERO_CHANGE_STREAMER_URI: `ws://change-streamer.${namespace}:4849`,
        ZERO_UPSTREAM_MAX_CONNS: '15',
        ZERO_CVR_MAX_CONNS: '160',
      },
      logging: {
        retention: '1 month',
      },
      loadBalancer: {
        public: true,
        rules: [
          {
            listen: '80/http',
            forward: '4848/http',
          },
          {
            listen: '4850/http',
          },
        ],
        health: {
          '4850/http': {
            path: '/',
            interval: '5 seconds',
            unhealthyThreshold: 2,
            healthyThreshold: 3,
            timeout: '3 seconds',
          },
        },
      },
      serviceRegistry: {
        port: 4848,
      },
      transform: {
        target: {
          healthCheck: {
            enabled: true,
            path: '/',
            protocol: 'HTTP',
          },
          stickiness: {
            enabled: true,
            type: 'lb_cookie',
          },
          loadBalancingAlgorithmType: 'least_outstanding_requests',
        },
        autoScalingTarget: {
          minCapacity: 1,
          maxCapacity: 10,
        },
      },
    })

    // Replication Manager Service
    cluster.addService(`${namespace}-replication-manager`, {
      cpu: '2 vCPU',
      memory: '8 GB',
      image: 'rocicorp/zero:canary',
      health: {
        command: ['CMD-SHELL', 'curl -f http://localhost:4849/ || exit 1'],
        interval: '5 seconds',
        retries: 3,
        startPeriod: '300 seconds',
      },
      environment: {
        ...commonEnv,
        ZERO_CHANGE_MAX_CONNS: '3',
        ZERO_NUM_SYNC_WORKERS: '0',
      },
      logging: {
        retention: '1 month',
      },
      serviceRegistry: {
        port: 4849,
      },
    })
  },
})
