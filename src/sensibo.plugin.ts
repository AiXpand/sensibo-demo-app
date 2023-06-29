import { AiXpandPlugin, AiXpandPluginInstance, Bind, PluginInstance, PluginPayload } from '@aixpand/client';

export const SENSIBO_SIGNATURE = 'BASIC_SENSIBO_01';

@PluginInstance(SENSIBO_SIGNATURE)
export class BasicSensiboConfig {
    @Bind('PROCESS_DELAY')
    processDelay: number;

    @Bind('PRC_GOLD')
    prcGold: number;

    constructor(processDelay: number = 0, prcGold: number = 0.98) {
        this.processDelay = processDelay;
        this.prcGold = prcGold;
    }
}

@PluginPayload(SENSIBO_SIGNATURE)
export class SensiboPayload {
    @Bind('a_temp')
    temperature: number;

    @Bind('a_humid')
    humidity: number;

    @Bind('a_time')
    date: string;
}

export class SensiboPluginFactory extends AiXpandPlugin<BasicSensiboConfig> {
    makePluginInstance(
        instanceId: string,
    ): AiXpandPluginInstance<BasicSensiboConfig> {
        return new AiXpandPluginInstance(instanceId, new BasicSensiboConfig());
    }
}
