// Offline Photo Editing Service

import { ImageManipulator } from 'expo-image-manipulator';
import { PhotoEditResult } from '../types';

export interface PhotoEditOptions {
  brightness?: number; // -1 to 1
  contrast?: number;   // -1 to 1
  saturation?: number; // -1 to 1
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: string[];
  rotate?: number; // degrees
  flip?: 'horizontal' | 'vertical';
}

class PhotoEditorService {
  private editHistory: PhotoEditResult[] = [];
  private currentEditIndex = -1;

  /**
   * Apply photo edits offline
   */
  async editPhoto(
    imageUri: string,
    options: PhotoEditOptions
  ): Promise<PhotoEditResult> {
    try {
      const actions: any[] = [];

      // Apply crop if specified
      if (options.crop) {
        actions.push({
          crop: {
            originX: options.crop.x,
            originY: options.crop.y,
            width: options.crop.width,
            height: options.crop.height,
          },
        });
      }

      // Apply rotation if specified
      if (options.rotate) {
        actions.push({ rotate: options.rotate });
      }

      // Apply flip if specified
      if (options.flip) {
        actions.push({ flip: options.flip });
      }

      // Apply resize for optimization
      actions.push({ resize: { width: 1024 } });

      // Process image
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Apply filters (simulated - in real implementation, use native filters)
      const filteredUri = await this.applyFilters(result.uri, options.filters || []);

      const editResult: PhotoEditResult = {
        originalUri: imageUri,
        editedUri: filteredUri,
        edits: {
          brightness: options.brightness,
          contrast: options.contrast,
          saturation: options.saturation,
          crop: options.crop,
          filters: options.filters,
        },
      };

      // Add to history
      this.addToHistory(editResult);

      return editResult;
    } catch (error) {
      console.error('Photo editing error:', error);
      throw error;
    }
  }

  /**
   * Apply multiple edits in sequence
   */
  async applyMultipleEdits(
    imageUri: string,
    edits: PhotoEditOptions[]
  ): Promise<PhotoEditResult> {
    let currentUri = imageUri;
    const allEdits: PhotoEditOptions = {};

    for (const edit of edits) {
      const result = await this.editPhoto(currentUri, edit);
      currentUri = result.editedUri;
      
      // Merge edits
      Object.assign(allEdits, edit);
    }

    return {
      originalUri: imageUri,
      editedUri: currentUri,
      edits: allEdits,
    };
  }

  /**
   * Apply filters to image
   */
  private async applyFilters(imageUri: string, filters: string[]): Promise<string> {
    if (filters.length === 0) {
      return imageUri;
    }

    // In a real implementation, you would use native image processing
    // For now, we'll simulate filter application
    try {
      const actions: any[] = [];

      for (const filter of filters) {
        switch (filter) {
          case 'vintage':
            actions.push({ 
              // Simulate vintage filter with color adjustments
              // In real implementation, use native image processing
            });
            break;
          case 'blackwhite':
            actions.push({
              // Simulate black and white filter
            });
            break;
          case 'sepia':
            actions.push({
              // Simulate sepia filter
            });
            break;
          case 'enhance':
            actions.push({
              // Simulate enhancement filter
            });
            break;
        }
      }

      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          actions,
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        return result.uri;
      }

      return imageUri;
    } catch (error) {
      console.error('Filter application error:', error);
      return imageUri;
    }
  }

  /**
   * Add edit to history
   */
  private addToHistory(edit: PhotoEditResult) {
    // Remove any edits after current index
    this.editHistory = this.editHistory.slice(0, this.currentEditIndex + 1);
    
    // Add new edit
    this.editHistory.push(edit);
    this.currentEditIndex = this.editHistory.length - 1;
  }

  /**
   * Undo last edit
   */
  async undo(): Promise<PhotoEditResult | null> {
    if (this.currentEditIndex > 0) {
      this.currentEditIndex--;
      return this.editHistory[this.currentEditIndex];
    }
    return null;
  }

  /**
   * Redo last undone edit
   */
  async redo(): Promise<PhotoEditResult | null> {
    if (this.currentEditIndex < this.editHistory.length - 1) {
      this.currentEditIndex++;
      return this.editHistory[this.currentEditIndex];
    }
    return null;
  }

  /**
   * Get edit history
   */
  getEditHistory(): PhotoEditResult[] {
    return this.editHistory;
  }

  /**
   * Clear edit history
   */
  clearHistory() {
    this.editHistory = [];
    this.currentEditIndex = -1;
  }

  /**
   * Batch process multiple images
   */
  async batchEditImages(
    imageUris: string[],
    options: PhotoEditOptions
  ): Promise<PhotoEditResult[]> {
    const results: PhotoEditResult[] = [];

    for (const uri of imageUris) {
      try {
        const result = await this.editPhoto(uri, options);
        results.push(result);
      } catch (error) {
        console.error(`Error editing image ${uri}:`, error);
      }
    }

    return results;
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imageUri: string): Promise<{
    width: number;
    height: number;
    size: number;
    format: string;
  }> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No actions, just get metadata
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        width: result.width,
        height: result.height,
        size: 0, // Size would need to be calculated separately
        format: 'jpeg',
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      throw error;
    }
  }

  /**
   * Optimize image for listing
   */
  async optimizeForListing(
    imageUri: string,
    marketplace: string
  ): Promise<PhotoEditResult> {
    const optimizationOptions: PhotoEditOptions = {};

    // Marketplace-specific optimizations
    switch (marketplace.toLowerCase()) {
      case 'ebay':
        optimizationOptions.crop = {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        };
        break;
      case 'amazon':
        optimizationOptions.crop = {
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        };
        break;
      case 'poshmark':
        optimizationOptions.crop = {
          x: 0,
          y: 0,
          width: 600,
          height: 800,
        };
        break;
      default:
        optimizationOptions.crop = {
          x: 0,
          y: 0,
          width: 800,
          height: 800,
        };
    }

    // Apply standard enhancements
    optimizationOptions.brightness = 0.1;
    optimizationOptions.contrast = 0.1;
    optimizationOptions.saturation = 0.05;
    optimizationOptions.filters = ['enhance'];

    return this.editPhoto(imageUri, optimizationOptions);
  }
}

export const photoEditorService = new PhotoEditorService();
