import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, FlatList, Switch } from 'react-native';
import { useAuthStore } from '../../src/state/useAuthStore';
import { ShippingAddressRecord } from '../../src/types/shipping';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export default function ShippingAddressesScreen() {
  const { orgId } = useAuthStore();
  const [addresses, setAddresses] = useState<ShippingAddressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddressRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
    email: '',
    isDefault: false,
  });

  async function loadAddresses() {
    setLoading(true);
    try {
      const response = await fetch(`${BASE}/functions/v1/shipping-addresses?orgId=${orgId}`);
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (e: any) {
      Alert.alert('Failed to load addresses', String(e.message));
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    if (!formData.name || !formData.street1 || !formData.city || !formData.state || !formData.zip) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const url = editingAddress 
        ? `${BASE}/functions/v1/shipping-addresses`
        : `${BASE}/functions/v1/shipping-addresses`;
      
      const method = editingAddress ? 'PUT' : 'POST';
      const body = editingAddress 
        ? { id: editingAddress.id, orgId, ...formData }
        : { orgId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        Alert.alert('Success', editingAddress ? 'Address updated' : 'Address added');
        resetForm();
        await loadAddresses();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to save address');
      }
    } catch (e: any) {
      Alert.alert('Error', String(e.message));
    }
  }

  async function deleteAddress(address: ShippingAddressRecord) {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete ${address.name}'s address?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE}/functions/v1/shipping-addresses?id=${address.id}&orgId=${orgId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                await loadAddresses();
              } else {
                Alert.alert('Error', 'Failed to delete address');
              }
            } catch (e: any) {
              Alert.alert('Error', String(e.message));
            }
          }
        }
      ]
    );
  }

  function resetForm() {
    setFormData({
      name: '',
      company: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      phone: '',
      email: '',
      isDefault: false,
    });
    setShowAddForm(false);
    setEditingAddress(null);
  }

  function startEdit(address: ShippingAddressRecord) {
    setFormData({
      name: address.name,
      company: address.company || '',
      street1: address.street1,
      street2: address.street2 || '',
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      phone: address.phone || '',
      email: address.email || '',
      isDefault: address.isDefault,
    });
    setEditingAddress(address);
    setShowAddForm(true);
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading addresses...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#007AFF', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }}>Shipping Addresses</Text>
        <Text style={{ color: 'white', opacity: 0.9, marginTop: 4 }}>
          Manage your shipping addresses
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Add/Edit Form */}
        {showAddForm && (
          <View style={{ backgroundColor: 'white', margin: 16, padding: 16, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </Text>

            <TextInput
              placeholder="Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
            />

            <TextInput
              placeholder="Company"
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
            />

            <TextInput
              placeholder="Street Address 1 *"
              value={formData.street1}
              onChangeText={(text) => setFormData({ ...formData, street1: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
            />

            <TextInput
              placeholder="Street Address 2"
              value={formData.street2}
              onChangeText={(text) => setFormData({ ...formData, street2: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                placeholder="City *"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
              />
              <TextInput
                placeholder="State *"
                value={formData.state}
                onChangeText={(text) => setFormData({ ...formData, state: text })}
                style={{ width: 80, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
              />
            </View>

            <TextInput
              placeholder="ZIP Code *"
              value={formData.zip}
              onChangeText={(text) => setFormData({ ...formData, zip: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
            />

            <TextInput
              placeholder="Phone"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
              keyboardType="phone-pad"
            />

            <TextInput
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ marginRight: 8 }}>Set as default address:</Text>
              <Switch
                value={formData.isDefault}
                onValueChange={(value) => setFormData({ ...formData, isDefault: value })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={resetForm}
                style={{ flex: 1, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8 }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveAddress}
                style={{ flex: 1, backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                  {editingAddress ? 'Update' : 'Add'} Address
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Address List */}
        <View style={{ padding: 16 }}>
          {!showAddForm && (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 12, marginBottom: 16 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                Add New Address
              </Text>
            </Pressable>
          )}

          {addresses.length === 0 ? (
            <View style={{ backgroundColor: 'white', padding: 32, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                No addresses yet
              </Text>
              <Text style={{ color: '#666', textAlign: 'center', marginBottom: 24 }}>
                Add your first shipping address to get started.
              </Text>
              <Pressable
                onPress={() => setShowAddForm(true)}
                style={{ backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  Add Address
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 16 }}>
                        {item.name}
                        {item.isDefault && (
                          <Text style={{ color: '#007AFF', fontSize: 12, marginLeft: 8 }}>
                            (Default)
                          </Text>
                        )}
                      </Text>
                      {item.company && (
                        <Text style={{ color: '#666', marginTop: 2 }}>{item.company}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => startEdit(item)}
                        style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600' }}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => deleteAddress(item)}
                        style={{ backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={{ color: '#666', lineHeight: 20 }}>
                    {item.street1}
                    {item.street2 && `\n${item.street2}`}
                    {`\n${item.city}, ${item.state} ${item.zip}`}
                    {item.country !== 'US' && `\n${item.country}`}
                  </Text>

                  {item.phone && (
                    <Text style={{ color: '#666', marginTop: 4 }}>📞 {item.phone}</Text>
                  )}
                  {item.email && (
                    <Text style={{ color: '#666', marginTop: 2 }}>✉️ {item.email}</Text>
                  )}
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
