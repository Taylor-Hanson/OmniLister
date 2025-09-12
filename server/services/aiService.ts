import OpenAI from "openai";

// OpenAI client - only initialized if API key is available
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn('OPENAI_API_KEY not set - AI features will be disabled');
}

export interface ProductAnalysis {
  title: string;
  description: string;
  brand: string;
  category: string;
  condition: string;
  size?: string;
  color: string;
  material?: string;
  suggestedPrice: number;
  tags: string[];
  confidence: number;
}

export interface ListingOptimization {
  optimizedTitle: string;
  optimizedDescription: string;
  seoKeywords: string[];
  marketplaceTips: Record<string, string>;
}

export class AIService {
  async analyzeProductFromImage(base64Image: string): Promise<ProductAnalysis> {
    if (!openai) {
      throw new Error("OpenAI API key not configured - AI features are disabled");
    }
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an expert product analyst for reselling platforms. Analyze the product in the image and provide detailed information for listing optimization. Focus on identifying:
            - Brand (be specific, look for logos, tags, distinctive design elements)
            - Category (clothing, electronics, accessories, etc.)
            - Condition (new, like new, good, fair, poor based on visible wear)
            - Size (if visible on tags or can be estimated)
            - Color (primary color, be specific)
            - Material (if identifiable)
            - Suggested price range based on brand and condition
            - Relevant tags for searchability
            
            Respond with JSON in this exact format: {
              "title": "Descriptive product title",
              "description": "Detailed product description highlighting key features and condition",
              "brand": "Brand name or 'Unknown' if not identifiable",
              "category": "Product category",
              "condition": "Condition assessment",
              "size": "Size if visible or null",
              "color": "Primary color",
              "material": "Material type or null",
              "suggestedPrice": "Estimated price in USD",
              "tags": ["array", "of", "relevant", "search", "tags"],
              "confidence": "Confidence score 0-1"
            }`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this product image for reselling purposes."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        title: result.title || "Product",
        description: result.description || "",
        brand: result.brand || "Unknown",
        category: result.category || "Other",
        condition: result.condition || "good",
        size: result.size || undefined,
        color: result.color || "",
        material: result.material || undefined,
        suggestedPrice: Number(result.suggestedPrice) || 0,
        tags: Array.isArray(result.tags) ? result.tags : [],
        confidence: Number(result.confidence) || 0.5,
      };
    } catch (error) {
      console.error("Error analyzing product image:", error);
      throw new Error("Failed to analyze product image");
    }
  }

  async optimizeListingForMarketplace(
    title: string,
    description: string,
    marketplace: string,
    category?: string
  ): Promise<ListingOptimization> {
    if (!openai) {
      throw new Error("OpenAI API key not configured - AI features are disabled");
    }
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an expert in marketplace optimization. Optimize the given listing for ${marketplace}. Consider:
            - Character limits and formatting requirements for ${marketplace}
            - Popular search terms and keywords for the category
            - Platform-specific best practices
            - SEO optimization for internal search
            
            Respond with JSON in this format: {
              "optimizedTitle": "Optimized title for ${marketplace}",
              "optimizedDescription": "Optimized description with proper formatting",
              "seoKeywords": ["array", "of", "relevant", "keywords"],
              "marketplaceTips": {
                "pricing": "Pricing strategy tip",
                "timing": "Best time to list tip",
                "photos": "Photo optimization tip"
              }
            }`
          },
          {
            role: "user",
            content: `Original Title: ${title}\nOriginal Description: ${description}\nCategory: ${category || 'Not specified'}\nOptimize for: ${marketplace}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        optimizedTitle: result.optimizedTitle || title,
        optimizedDescription: result.optimizedDescription || description,
        seoKeywords: Array.isArray(result.seoKeywords) ? result.seoKeywords : [],
        marketplaceTips: result.marketplaceTips || {},
      };
    } catch (error) {
      console.error("Error optimizing listing:", error);
      throw new Error("Failed to optimize listing");
    }
  }

  async generateListingFromVoice(transcript: string): Promise<Partial<ProductAnalysis>> {
    if (!openai) {
      throw new Error("OpenAI API key not configured - AI features are disabled");
    }
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an assistant that converts voice descriptions into structured product listings. Extract product information from the voice transcript and format it for listing creation.
            
            Respond with JSON in this format: {
              "title": "Product title based on description",
              "description": "Formatted product description",
              "brand": "Brand if mentioned or null",
              "category": "Product category",
              "condition": "Condition if mentioned or 'good'",
              "size": "Size if mentioned or null",
              "color": "Color if mentioned or null",
              "suggestedPrice": "Price if mentioned or null"
            }`
          },
          {
            role: "user",
            content: `Voice transcript: ${transcript}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        title: result.title,
        description: result.description,
        brand: result.brand,
        category: result.category,
        condition: result.condition || 'good',
        size: result.size,
        color: result.color,
        suggestedPrice: result.suggestedPrice ? Number(result.suggestedPrice) : undefined,
      };
    } catch (error) {
      console.error("Error generating listing from voice:", error);
      throw new Error("Failed to generate listing from voice");
    }
  }

  async removeBackground(base64Image: string): Promise<string> {
    // In a real implementation, this would use a background removal service
    // For now, return the original image
    // TODO: Integrate with Remove.bg API or similar service
    return base64Image;
  }

  async enhanceProductImage(base64Image: string): Promise<string> {
    // In a real implementation, this would enhance the image quality
    // For now, return the original image
    // TODO: Integrate with image enhancement services
    return base64Image;
  }
}

export const aiService = new AIService();
