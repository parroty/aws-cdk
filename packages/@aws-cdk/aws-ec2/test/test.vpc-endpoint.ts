import { expect, haveResource } from '@aws-cdk/assert';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { Stack } from '@aws-cdk/cdk';
import { Test } from 'nodeunit';
import { SubnetType, TcpPort, VpcEndpointAwsService, VpcGatewayEndpoint, VpcInterfaceEndpoint, VpcNetwork } from '../lib';

export = {
  'gateway endpoint': {
    'add an endpoint to a vpc'(test: Test) {
      // GIVEN
      const stack = new Stack();

      // WHEN
      new VpcNetwork(stack, 'VpcNetwork', {
        gatewayEndpoints: {
          S3: {
            service: VpcEndpointAwsService.S3
          }
        }
      });

      // THEN
      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              {
                Ref: 'AWS::Region'
              },
              '.s3'
            ]
          ]
        },
        VpcId: {
          Ref: 'VpcNetworkB258E83A'
        },
        RouteTableIds: [
          {
            Ref: 'VpcNetworkPrivateSubnet1RouteTableCD085FF1'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet2RouteTableE97B328B'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet3RouteTableE0C661A2'
          }
        ],
        VpcEndpointType: 'Gateway'
      }));

      test.done();
    },

    'throws when creating with a bad endpoint type'(test: Test) {
      // GIVEN
      const stack = new Stack();

      // WHEN
      const vpc = new VpcNetwork(stack, 'VpcNetwork');

      // THEN
      test.throws(() => vpc.addGatewayEndpoint('Bad', {
        service: VpcEndpointAwsService.Ec2
      }), /`Gateway`/);

      test.done();
    },

    'routing on private and public subnets'(test: Test) {
      // GIVEN
      const stack = new Stack();

      // WHEN
      new VpcNetwork(stack, 'VpcNetwork', {
        gatewayEndpoints: {
          S3: {
            service: VpcEndpointAwsService.S3,
            subnets: [
              { subnetType: SubnetType.Public },
              { subnetType: SubnetType.Private }
            ]
          }
        }
      });

      // THEN
      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              {
                Ref: 'AWS::Region'
              },
              '.s3'
            ]
          ]
        },
        VpcId: {
          Ref: 'VpcNetworkB258E83A'
        },
        RouteTableIds: [
          {
            Ref: 'VpcNetworkPublicSubnet1RouteTable25CCC53F'
          },
          {
            Ref: 'VpcNetworkPublicSubnet2RouteTableE5F348DF'
          },
          {
            Ref: 'VpcNetworkPublicSubnet3RouteTable36E30B07'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet1RouteTableCD085FF1'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet2RouteTableE97B328B'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet3RouteTableE0C661A2'
          }
        ],
        VpcEndpointType: 'Gateway'
      }));

      test.done();
    },

    'add statements to policy'(test: Test) {
      // GIVEN
      const stack = new Stack();
      const vpc = new VpcNetwork(stack, 'VpcNetwork');
      const endpoint = vpc.addGatewayEndpoint('S3', {
        service: VpcEndpointAwsService.S3
      });

      // WHEN
      endpoint.addToPolicy(
        new PolicyStatement()
          .addAnyPrincipal()
          .addActions('s3:GetObject', 's3:ListBucket')
          .addAllResources()
      );

      // THEN
      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                's3:GetObject',
                's3:ListBucket'
              ],
              Effect: 'Allow',
              Principal: '*',
              Resource: '*'
            }
          ],
          Version: '2012-10-17'
        }
      }));

      test.done();
    },

    'throws when adding a statement without a principal'(test: Test) {
      // GIVEN
      const stack = new Stack();
      const vpc = new VpcNetwork(stack, 'VpcNetwork');
      const endpoint = vpc.addGatewayEndpoint('S3', {
        service: VpcEndpointAwsService.S3
      });

      // THEN
      test.throws(() => endpoint.addToPolicy(
        new PolicyStatement()
          .addActions('s3:GetObject', 's3:ListBucket')
          .addAllResources()
      ), /`Principal`/);

      test.done();
    },

    'import/export'(test: Test) {
      // GIVEN
      const stack1 = new Stack();
      const stack2 = new Stack();
      const vpc = new VpcNetwork(stack1, 'Vpc1');
      const endpoint = vpc.addGatewayEndpoint('DynamoDB', {
        service: VpcEndpointAwsService.DynamoDb
      });

      // WHEN
      VpcGatewayEndpoint.import(stack2, 'ImportedEndpoint', endpoint.export());

      // THEN: No error
      test.done();
    },

    'conveniance methods for S3 and DynamoDB'(test: Test) {
      // GIVEN
      const stack = new Stack();
      const vpc = new VpcNetwork(stack, 'VpcNetwork');

      // WHEN
      vpc.addS3Endpoint('S3');
      vpc.addDynamoDbEndpoint('DynamoDb');

      // THEN
      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              {
                Ref: 'AWS::Region'
              },
              '.s3'
            ]
          ]
        },
      }));

      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              {
                Ref: 'AWS::Region'
              },
              '.dynamodb'
            ]
          ]
        },
      }));

      test.done();
    }
  },

  'interface endpoint': {
    'add an endpoint to a vpc'(test: Test) {
      // GIVEN
      const stack = new Stack();
      const vpc = new VpcNetwork(stack, 'VpcNetwork');

      // WHEN
      vpc.addInterfaceEndpoint('EcrDocker', {
        service: VpcEndpointAwsService.EcrDocker
      });

      // THEN
      expect(stack).to(haveResource('AWS::EC2::VPCEndpoint', {
        ServiceName: {
          'Fn::Join': [
            '',
            [
              'com.amazonaws.',
              {
                Ref: 'AWS::Region'
              },
              '.ecr.dkr'
            ]
          ]
        },
        VpcId: {
          Ref: 'VpcNetworkB258E83A'
        },
        PrivateDnsEnabled: true,
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              'VpcNetworkEcrDockerSecurityGroup7C91D347',
              'GroupId'
            ]
          }
        ],
        SubnetIds: [
          {
            Ref: 'VpcNetworkPrivateSubnet1Subnet07BA143B'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet2Subnet5E4189D6'
          },
          {
            Ref: 'VpcNetworkPrivateSubnet3Subnet5D16E0FB'
          }
        ],
        VpcEndpointType: 'Interface'
      }));

      expect(stack).to(haveResource('AWS::EC2::SecurityGroup', {
        GroupDescription: 'VpcNetwork/EcrDocker/SecurityGroup',
        VpcId: {
          Ref: 'VpcNetworkB258E83A'
        }
      }));

      test.done();
    },

    'throws when creating with a bad endpoint type'(test: Test) {
      // GIVEN
      const stack = new Stack();

      // WHEN
      const vpc = new VpcNetwork(stack, 'VpcNetwork');

      // THEN
      test.throws(() => vpc.addInterfaceEndpoint('Bad', {
        service: VpcEndpointAwsService.S3
      }), /`Interface`/);

      test.done();
    },

    'throws when using more than one subnet per availability zone'(test: Test) {
      // GIVEN
      const stack = new Stack();

      // WHEN
      const vpc = new VpcNetwork(stack, 'VpcNetwork', {
        maxAZs: 1,
        subnetConfiguration: [
          {name: 'app', subnetType: SubnetType.Private },
          {name: 'db', subnetType: SubnetType.Private },
        ]
      });

      // THEN
      test.throws(() => vpc.addInterfaceEndpoint('Bad', {
        service: VpcEndpointAwsService.SecretsManager
      }), /availability zone/);

      test.done();
    },

    'import/export'(test: Test) {
      // GIVEN
      const stack1 = new Stack();
      const stack2 = new Stack();
      const vpc = new VpcNetwork(stack1, 'Vpc1');
      const endpoint = vpc.addInterfaceEndpoint('EC2', {
        service: VpcEndpointAwsService.Ec2
      });

      // WHEN
      const importedEndpoint = VpcInterfaceEndpoint.import(stack2, 'ImportedEndpoint', endpoint.export());
      importedEndpoint.connections.allowFromAnyIPv4(new TcpPort(443));

      // THEN
      expect(stack2).to(haveResource('AWS::EC2::SecurityGroupIngress', {
        GroupId: {
          'Fn::ImportValue': 'Stack:Vpc1EC2SecurityGroupId3B169C3F'
        }
      }));

      test.done();
    }
  }
};
