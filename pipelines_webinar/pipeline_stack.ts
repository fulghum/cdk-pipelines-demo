import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { SecretValue } from '@aws-cdk/core';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { CdkPipeline, ShellScriptAction, SimpleSynthAction } from '@aws-cdk/pipelines';
import { WebServiceStage } from './webservice_stage';

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new Artifact();
        const cloudAssemblyArtifact = new Artifact();

        const sourceAction = new GitHubSourceAction({
            actionName: 'GitHub',
            output: sourceArtifact,
            oauthToken: SecretValue.secretsManager('github-token'),
            owner: 'fulghum',
            repo: 'cdk-pipelines-demo',
            branch: 'typescript',
            trigger: GitHubTrigger.POLL
        });

        const synthAction = new SimpleSynthAction({
            sourceArtifact,
            cloudAssemblyArtifact,
            installCommands: [
                'npm install -g aws-cdk',
                'npm install',
            ],
            buildCommands: [
                'npm run build',
                'npm run unit',
            ],
            synthCommand: 'npm run build && cdk synth'
        });

        const pipeline = new CdkPipeline(this, 'Pipeline', {
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });

        // Preprod Stage
        const preprodApp = new WebServiceStage(this, 'Preprod');
        const preprodStage = pipeline.addApplicationStage(preprodApp);
        preprodStage.addManualApprovalAction();


        // Prod Stage
        const prodApp = new WebServiceStage(this, 'Prod');
        const prodStage = pipeline.addApplicationStage(prodApp);
    }
}
