import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionCard from '@/components/SubscriptionCard';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

export default function SubscriptionDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isLoaded, isSignedIn } = useAuth();
    const subscription = useSubscriptionStore(state => state.subscriptions.find(item => item.id === id));

    if (!isLoaded) return null;
    if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

    return (
        <SafeAreaView style={{ flex: 1, padding: 20 }}>
            {subscription
                ? <SubscriptionCard {...subscription} expanded onPress={() => {}} />
                : <Text>Subscription not found.</Text>}
        </SafeAreaView>
    );
}
