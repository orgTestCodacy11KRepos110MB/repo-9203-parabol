import {Configuration, OpenAIApi} from 'openai'

class OpenAIManager {
  openai: any

  private createCompletion = async (prompt: string) => {
    return await this.openai.createCompletion({
      model: 'text-curie-001',
      prompt,
      temperature: 0,
      max_tokens: 180,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  }

  summarizeReflectionGroup = async (promptReflectionMapping: Map<string, string[]>) => {
    let reflectionStrings = ''
    promptReflectionMapping.forEach((reflections, prompt) => {
      const answers = reflections
        .map((plaintextContent) => `someone answered '${plaintextContent}'`)
        .join(', ')
      reflectionStrings += `One the question '${prompt}', ${answers}.`
    })
    const prompt = `${reflectionStrings}\n\nTl;dr\n\n`
    return await this.createCompletion(prompt)
  }

  summarizeDiscussion = async (topicTitle: string, commentsStr: string) => {
    const prompt = `Summarize the meeting notes on the topic "${topicTitle}":\n${commentsStr}\n`
    return await this.createCompletion(prompt)
  }

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.openai = new OpenAIApi(configuration)
  }
}

export default OpenAIManager
