import { Tabs } from "expo-router";

const TabLayout = () => (
    <Tabs screenOptions={{
        headerShown: false}}>
    <Tabs.Screen name="index" options={{title: "Home"}} />
    </Tabs>
)

export default TabLayout;
