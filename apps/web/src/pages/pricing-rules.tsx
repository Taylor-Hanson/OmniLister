import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import { flag } from '@omnilister/flags';
import { entitlementsService, Entitlement } from '@omnilister/core';

interface PricingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    marketplace?: string;
    category?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    daysListed?: number;
  };
  actions: {
    type: 'adjust_price' | 'set_price' | 'delist';
    value: number;
    percentage?: boolean;
  };
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function PricingRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    checkEntitlement();
    loadRules();
  }, []);

  const checkEntitlement = async () => {
    try {
      const userId = 'current-user-id'; // This would come from auth context
      const hasAccess = await entitlementsService.hasEntitlement(userId, 'ADV_AUTOMATION');
      setHasEntitlement(hasAccess);
    } catch (error) {
      console.error('Error checking entitlement:', error);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, this would fetch from API
      const mockRules: PricingRule[] = [
        {
          id: '1',
          name: 'Reduce price after 30 days',
          description: 'Automatically reduce price by 10% after 30 days on market',
          enabled: true,
          conditions: {
            daysListed: 30,
          },
          actions: {
            type: 'adjust_price',
            value: -10,
            percentage: true,
          },
          priority: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Delist stale items',
          description: 'Delist items that have been listed for more than 90 days',
          enabled: false,
          conditions: {
            daysListed: 90,
          },
          actions: {
            type: 'delist',
            value: 0,
          },
          priority: 2,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];
      setRules(mockRules);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      ));
      // In real implementation, this would call the API
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      // In real implementation, this would call the API
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  if (!flag('web.pricingAutomation')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pricing Automation</h1>
          <p className="text-gray-600">This feature is currently disabled.</p>
        </div>
      </div>
    );
  }

  if (!hasEntitlement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pricing Automation</h1>
          <p className="text-gray-600 mb-6">
            This feature requires an Advanced Automation subscription.
          </p>
          <Button onClick={() => router.push('/pricing')}>
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pricing Rules</h1>
          <p className="text-gray-600 mt-2">
            Automate your pricing strategy with intelligent rules
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading rules...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {rule.name}
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => handleToggleRule(rule.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* Edit rule */}}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Conditions</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {rule.conditions.marketplace && (
                        <p>Marketplace: {rule.conditions.marketplace}</p>
                      )}
                      {rule.conditions.category && (
                        <p>Category: {rule.conditions.category}</p>
                      )}
                      {rule.conditions.daysListed && (
                        <p>Days listed: {rule.conditions.daysListed}+</p>
                      )}
                      {rule.conditions.priceRange && (
                        <p>
                          Price range: ${rule.conditions.priceRange.min} - ${rule.conditions.priceRange.max}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Actions</h4>
                    <div className="text-sm text-gray-600">
                      {rule.actions.type === 'adjust_price' && (
                        <p>
                          {rule.actions.percentage ? 'Adjust price by' : 'Set price to'} {rule.actions.value}
                          {rule.actions.percentage ? '%' : '$'}
                        </p>
                      )}
                      {rule.actions.type === 'set_price' && (
                        <p>Set price to ${rule.actions.value}</p>
                      )}
                      {rule.actions.type === 'delist' && (
                        <p>Delist item</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Priority: {rule.priority}</span>
                    <span>Updated: {rule.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSave={(rule) => {
            setRules(prev => [...prev, rule]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

interface CreateRuleModalProps {
  onClose: () => void;
  onSave: (rule: PricingRule) => void;
}

function CreateRuleModal({ onClose, onSave }: CreateRuleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    conditions: {
      marketplace: '',
      category: '',
      priceRange: { min: 0, max: 0 },
      daysListed: 0,
    },
    actions: {
      type: 'adjust_price' as const,
      value: 0,
      percentage: true,
    },
    priority: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: PricingRule = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onSave(newRule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Pricing Rule</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="action-type">Action Type</Label>
            <Select
              value={formData.actions.type}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                actions: { ...prev.actions, type: value as any }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_price">Adjust Price</SelectItem>
                <SelectItem value="set_price">Set Price</SelectItem>
                <SelectItem value="delist">Delist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Rule</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
