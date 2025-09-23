import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, FlatList, Switch } from 'react-native';
import { useAuthStore } from '@/src/state/useAuthStore';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

type Contact = {
  email: string;
  slack_webhook_url?: string;
  notify: boolean;
  role?: string;
};

export default function QBContactsScreen() {
  const { orgId } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newSlack, setNewSlack] = useState('');
  const [newRole, setNewRole] = useState('');

  async function loadContacts() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/rest/v1/org_contacts?org_id=eq.${orgId}`, {
        headers: { 'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! }
      });
      const data = await r.json();
      setContacts(data || []);
    } catch (e: any) {
      Alert.alert('Failed to load contacts', String(e.message));
    } finally {
      setLoading(false);
    }
  }

  async function addContact() {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    try {
      const contact: Contact = {
        email: newEmail.trim(),
        slack_webhook_url: newSlack.trim() || undefined,
        notify: true,
        role: newRole.trim() || undefined
      };

      const r = await fetch(`${BASE}/rest/v1/org_contacts`, {
        method: 'POST',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: orgId,
          ...contact
        })
      });

      if (r.ok) {
        setNewEmail('');
        setNewSlack('');
        setNewRole('');
        await loadContacts();
      } else {
        const error = await r.json();
        Alert.alert('Failed to add contact', error.message || 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Failed to add contact', String(e.message));
    }
  }

  async function updateContact(email: string, updates: Partial<Contact>) {
    try {
      const r = await fetch(`${BASE}/rest/v1/org_contacts?org_id=eq.${orgId}&email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (r.ok) {
        await loadContacts();
      } else {
        const error = await r.json();
        Alert.alert('Failed to update contact', error.message || 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Failed to update contact', String(e.message));
    }
  }

  async function deleteContact(email: string) {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const r = await fetch(`${BASE}/rest/v1/org_contacts?org_id=eq.${orgId}&email=eq.${encodeURIComponent(email)}`, {
                method: 'DELETE',
                headers: { 'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! }
              });

              if (r.ok) {
                await loadContacts();
              } else {
                Alert.alert('Failed to delete contact', 'Please try again');
              }
            } catch (e: any) {
              Alert.alert('Failed to delete contact', String(e.message));
            }
          }
        }
      ]
    );
  }

  useEffect(() => {
    loadContacts();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Alert Contacts</Text>
      
      {/* Add new contact */}
      <View style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', marginBottom: 12 }}>Add Contact</Text>
        
        <TextInput
          placeholder="Email address"
          value={newEmail}
          onChangeText={setNewEmail}
          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 8 }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          placeholder="Slack webhook URL (optional)"
          value={newSlack}
          onChangeText={setNewSlack}
          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 8 }}
          autoCapitalize="none"
        />
        
        <TextInput
          placeholder="Role (optional)"
          value={newRole}
          onChangeText={setNewRole}
          style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        
        <Pressable
          onPress={addContact}
          style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>Add Contact</Text>
        </Pressable>
      </View>

      {/* Contacts list */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.email}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '600', flex: 1 }}>{item.email}</Text>
              <Pressable
                onPress={() => deleteContact(item.email)}
                style={{ backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
              >
                <Text style={{ color: 'white', fontSize: 12 }}>Delete</Text>
              </Pressable>
            </View>
            
            {item.role && <Text style={{ color: '#666', marginBottom: 4 }}>Role: {item.role}</Text>}
            {item.slack_webhook_url && <Text style={{ color: '#666', marginBottom: 8, fontSize: 12 }}>Slack: {item.slack_webhook_url.substring(0, 50)}...</Text>}
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8 }}>Receive alerts:</Text>
              <Switch
                value={item.notify}
                onValueChange={(value) => updateContact(item.email, { notify: value })}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
            No contacts configured. Add contacts to receive QuickBooks status alerts.
          </Text>
        }
      />
    </View>
  );
}
