import {Configuration, OpenAIApi} from 'openai'

class OpenAIManager {
  openai: any

  createCompletion = async (prompt: string) => {
    return await this.openai.createCompletion({
      model: 'text-davinci-002',
      prompt,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  }

  constructor() {
    const configuration = new Configuration({
      apiKey: window.__ACTION__.openAi
    })
    this.openai = new OpenAIApi(configuration)
  }
}

export default OpenAIManager
