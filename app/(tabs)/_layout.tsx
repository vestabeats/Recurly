import {Tabs, Redirect} from "expo-router";
import {tabs} from "@/constants/data";
import {View, Image} from "react-native";
import { colors, components } from '@/constants/theme'
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from '@clerk/expo';
import { useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";

const tabBar = components.tabBar;

const TabIcon = ({focused, icon}: TabIconProps) => {
    return (
        <View className="tabs-icon">
            <View className={clsx('tabs-pill', focused && 'tabs-active')}>
                <Image source={icon} resizeMode="contain" className="tabs-glyph"/>
            </View>
        </View>
    );
};
const TabLayout = () => {
    const { isSignedIn, isLoaded, userId } = useAuth();
    const insets = useSafeAreaInsets();
    const identifiedUserId = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        if (!isSignedIn || !userId) {
            if (identifiedUserId.current) {
                posthog?.reset();
                identifiedUserId.current = null;
            }
            return;
        }

        if (identifiedUserId.current === userId) {
            return;
        }

        if (identifiedUserId.current) {
            posthog?.reset();
        }

        posthog?.identify(userId);
        identifiedUserId.current = userId;
    }, [isLoaded, isSignedIn, userId]);

    // Wait for auth to load before rendering anything
    if (!isLoaded) {
        return null;
    }

    // Redirect to sign-in if user is not authenticated
    if (!isSignedIn) {
        return <Redirect href="/(auth)/sign-in" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Math.max(insets.bottom, tabBar.horizontalInset),
                    height: tabBar.height,
                    marginHorizontal: tabBar.horizontalInset,
                    borderRadius: tabBar.radius,
                    backgroundColor: colors.primary,
                    borderTopWidth: 0,
                    elevation: 0,
                },
                tabBarItemStyle: {
                    paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6
                },
                tabBarIconStyle: {
                    width: tabBar.iconFrame,
                    height: tabBar.iconFrame,
                    alignItems: 'center'
                }
            }}
        >
            {tabs.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({focused}) => (
                            <TabIcon focused={focused} icon={tab.icon} />
                        )
                    }}/>
            ))}
        </Tabs>
    )
}

export default TabLayout;
