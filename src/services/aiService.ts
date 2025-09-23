// Dual AI Model Integration Service
// First platform to use GPT-5 + Claude simultaneously

import { AIAnalysis } from '../types';

interface AIProvider {
  name: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  baseUrl: string;
}

interface AIResponse {
  content: string;
  confidence: number;
  processingTime: number;
  model: string;
}

class DualAIService {
  private providers: AIProvider[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // GPT-5 Provider
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        model: 'gpt-5',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1'
      });
    }

    // Claude Provider
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1'
      });
    }

    this.isInitialized = this.providers.length > 0;
  }

  /**
   * Analyze product image with dual AI models for cross-validation
   */
  async analyzeProductImage(imageUri: string): Promise<AIAnalysis> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      throw new Error('AI service not initialized. Please check API keys.');
    }

    try {
      // Run analysis on both models simultaneously
      const [gpt5Result, claudeResult] = await Promise.allSettled([
        this.analyzeWithGPT5(imageUri),
        this.analyzeWithClaude(imageUri)
      ]);

      // Cross-validate results
      const analysis = this.crossValidateResults(
        gpt5Result,
        claudeResult,
        'product_recognition'
      );

      return {
        id: `analysis_${Date.now()}`,
        type: 'product_recognition',
        input: imageUri,
        output: analysis,
        model: 'dual',
        confidence: analysis.confidence,
        processingTime: Date.now() - startTime,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Dual AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate product description with dual AI models
   */
  async generateProductDescription(
    productData: any,
    marketplace: string
  ): Promise<AIAnalysis> {
    const startTime = Date.now();
    
    const prompt = this.buildDescriptionPrompt(productData, marketplace);
    
    const [gpt5Result, claudeResult] = await Promise.allSettled([
      this.generateWithGPT5(prompt),
      this.generateWithClaude(prompt)
    ]);

    const analysis = this.crossValidateResults(
      gpt5Result,
      claudeResult,
      'description_generation'
    );

    return {
      id: `analysis_${Date.now()}`,
      type: 'description_generation',
      input: productData,
      output: analysis,
      model: 'dual',
      confidence: analysis.confidence,
      processingTime: Date.now() - startTime,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Optimize pricing with dual AI models
   */
  async optimizePricing(
    productData: any,
    marketData: any[]
  ): Promise<AIAnalysis> {
    const startTime = Date.now();
    
    const prompt = this.buildPricingPrompt(productData, marketData);
    
    const [gpt5Result, claudeResult] = await Promise.allSettled([
      this.generateWithGPT5(prompt),
      this.generateWithClaude(prompt)
    ]);

    const analysis = this.crossValidateResults(
      gpt5Result,
      claudeResult,
      'price_optimization'
    );

    return {
      id: `analysis_${Date.now()}`,
      type: 'price_optimization',
      input: { productData, marketData },
      output: analysis,
      model: 'dual',
      confidence: analysis.confidence,
      processingTime: Date.now() - startTime,
      createdAt: new Date().toISOString()
    };
  }

  private async analyzeWithGPT5(imageUri: string): Promise<AIResponse> {
    const provider = this.providers.find(p => p.name === 'openai');
    if (!provider) throw new Error('GPT-5 provider not available');

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this product image and provide: 1) Product name, 2) Brand, 3) Category, 4) Condition assessment, 5) Key features, 6) Estimated value range. Be specific and accurate.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUri }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      confidence: 0.9, // GPT-5 confidence
      processingTime: Date.now(),
      model: 'gpt-5'
    };
  }

  private async analyzeWithClaude(imageUri: string): Promise<AIResponse> {
    const provider = this.providers.find(p => p.name === 'anthropic');
    if (!provider) throw new Error('Claude provider not available');

    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this product image and provide: 1) Product name, 2) Brand, 3) Category, 4) Condition assessment, 5) Key features, 6) Estimated value range. Be specific and accurate.'
              },
              {
                type: 'image',
                source: {
                  type: 'url',
                  media_type: 'image/jpeg',
                  data: imageUri
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    return {
      content: data.content[0].text,
      confidence: 0.9, // Claude confidence
      processingTime: Date.now(),
      model: 'claude'
    };
  }

  private async generateWithGPT5(prompt: string): Promise<AIResponse> {
    const provider = this.providers.find(p => p.name === 'openai');
    if (!provider) throw new Error('GPT-5 provider not available');

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      confidence: 0.9,
      processingTime: Date.now(),
      model: 'gpt-5'
    };
  }

  private async generateWithClaude(prompt: string): Promise<AIResponse> {
    const provider = this.providers.find(p => p.name === 'anthropic');
    if (!provider) throw new Error('Claude provider not available');

    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return {
      content: data.content[0].text,
      confidence: 0.9,
      processingTime: Date.now(),
      model: 'claude'
    };
  }

  private crossValidateResults(
    gpt5Result: PromiseSettledResult<AIResponse>,
    claudeResult: PromiseSettledResult<AIResponse>,
    type: string
  ): any {
    const results = [];
    let confidence = 0;

    if (gpt5Result.status === 'fulfilled') {
      results.push({ model: 'gpt-5', ...gpt5Result.value });
      confidence += gpt5Result.value.confidence;
    }

    if (claudeResult.status === 'fulfilled') {
      results.push({ model: 'claude', ...claudeResult.value });
      confidence += claudeResult.value.confidence;
    }

    // Calculate average confidence
    confidence = confidence / results.length;

    // Cross-validation logic
    const consensus = this.findConsensus(results);
    
    return {
      results,
      consensus,
      confidence,
      crossValidated: results.length > 1,
      type
    };
  }

  private findConsensus(results: any[]): any {
    if (results.length === 1) return results[0];

    // Simple consensus finding - in production, implement more sophisticated logic
    const gpt5Result = results.find(r => r.model === 'gpt-5');
    const claudeResult = results.find(r => r.model === 'claude');

    if (gpt5Result && claudeResult) {
      // Combine insights from both models
      return {
        content: `${gpt5Result.content}\n\nClaude Analysis: ${claudeResult.content}`,
        confidence: (gpt5Result.confidence + claudeResult.confidence) / 2,
        models: ['gpt-5', 'claude']
      };
    }

    return results[0];
  }

  private buildDescriptionPrompt(productData: any, marketplace: string): string {
    return `Generate an optimized product description for ${marketplace} marketplace.
    
    Product Data: ${JSON.stringify(productData)}
    
    Requirements:
    - Optimize for ${marketplace} SEO
    - Include key features and benefits
    - Use appropriate keywords
    - Maintain professional tone
    - Include condition details
    - Add relevant tags
    
    Generate a compelling description that will increase visibility and sales.`;
  }

  private buildPricingPrompt(productData: any, marketData: any[]): string {
    return `Analyze market data and suggest optimal pricing for this product.
    
    Product: ${JSON.stringify(productData)}
    Market Data: ${JSON.stringify(marketData)}
    
    Provide:
    - Recommended price range
    - Competitive analysis
    - Pricing strategy
    - Market positioning
    - Profit margin analysis`;
  }
}

export const dualAIService = new DualAIService();
