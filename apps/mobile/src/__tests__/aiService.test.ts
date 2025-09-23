import { dualAIService } from '../services/aiService';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

describe('DualAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeProductImage', () => {
    it('should analyze product image with dual AI models', async () => {
      const mockImageUri = 'test-image-uri';
      
      // Mock fetch responses for both AI providers
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'GPT-5 analysis: iPhone 13, Electronics, Good condition' } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: 'Claude analysis: Apple iPhone 13, Mobile phone, Excellent condition' }]
          })
        });

      const result = await dualAIService.analyzeProductImage(mockImageUri);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type', 'product_recognition');
      expect(result).toHaveProperty('model', 'dual');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('output');
      expect(result.output).toHaveProperty('consensus');
      expect(result.output).toHaveProperty('results');
      expect(result.output.results).toHaveLength(2);
    });

    it('should handle API failures gracefully', async () => {
      const mockImageUri = 'test-image-uri';
      
      // Mock fetch to reject
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(dualAIService.analyzeProductImage(mockImageUri))
        .rejects.toThrow('Dual AI analysis failed');
    });

    it('should work with single AI provider if one fails', async () => {
      const mockImageUri = 'test-image-uri';
      
      // Mock one success, one failure
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'GPT-5 analysis: Product details' } }]
          })
        })
        .mockRejectedValueOnce(new Error('Claude API Error'));

      const result = await dualAIService.analyzeProductImage(mockImageUri);

      expect(result).toHaveProperty('output');
      expect(result.output.results).toHaveLength(1);
      expect(result.output.results[0].model).toBe('gpt-5');
    });
  });

  describe('generateProductDescription', () => {
    it('should generate product description with dual AI', async () => {
      const productData = {
        title: 'iPhone 13',
        category: 'Electronics',
        condition: 'good'
      };
      const marketplace = 'ebay';

      // Mock fetch responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'GPT-5 generated description' } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: 'Claude generated description' }]
          })
        });

      const result = await dualAIService.generateProductDescription(productData, marketplace);

      expect(result).toHaveProperty('type', 'description_generation');
      expect(result).toHaveProperty('model', 'dual');
      expect(result).toHaveProperty('output');
    });
  });

  describe('optimizePricing', () => {
    it('should optimize pricing with dual AI', async () => {
      const productData = { title: 'iPhone 13', price: 500 };
      const marketData = [{ price: 450, marketplace: 'ebay' }];

      // Mock fetch responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Recommended price: $475' } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: 'Optimal price: $480' }]
          })
        });

      const result = await dualAIService.optimizePricing(productData, marketData);

      expect(result).toHaveProperty('type', 'price_optimization');
      expect(result).toHaveProperty('model', 'dual');
    });
  });
});
