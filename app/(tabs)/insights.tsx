import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Insights() {
    return (
        <SafeAreaView style={{ flex: 1, padding: 20 }}>
            <Text className="text-xl font-bold">Insights</Text>
            <Text>Insights are not available yet.</Text>
        </SafeAreaView>
    );
}
