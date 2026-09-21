import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
    return (
        <SafeAreaView style={{ flex: 1, padding: 20 }}>
            <Text className="text-xl font-bold">Settings</Text>
            <Text>Settings are not available yet.</Text>
        </SafeAreaView>
    );
}
