import { useState } from 'react';
import { FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionCard from '@/components/SubscriptionCard';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

export default function Subscriptions() {
    const subscriptions = useSubscriptionStore(state => state.subscriptions);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <FlatList
                data={subscriptions}
                contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 12 }}
                ListHeaderComponent={<Text className="text-xl font-bold">Subscriptions</Text>}
                ListEmptyComponent={<Text>No subscriptions yet.</Text>}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <SubscriptionCard {...item} expanded={expandedId === item.id}
                        onPress={() => setExpandedId(current => current === item.id ? null : item.id)} />
                )}
            />
        </SafeAreaView>
    );
}
