import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter, type Href } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/expo';
import { useState } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { posthog } from '@/lib/posthog';

const SafeAreaView = styled(RNSafeAreaView);
// Matches the password policy configured for this Clerk instance.
const MIN_PASSWORD_LENGTH = 15;

const SignUp = () => {
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isSignedIn } = useAuth();
    const router = useRouter();


    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'details' | 'verification'>('details');
    const [emailNotice, setEmailNotice] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const verificationEmail = signUp.emailAddress || emailAddress.trim();

    const sendVerificationEmail = async () => {
        if (isSendingEmail) return;
        if (!signUp.emailAddress) {
            setEmailError('No email address is attached to this signup. Use a different email to start again.');
            setEmailNotice('');
            return;
        }
        setIsSendingEmail(true);
        setEmailError('');
        setEmailNotice('');
        try {
            const { error } = await signUp.verifications.sendEmailCode();
            if (error) {
                setEmailError(error.message || 'Unable to send the verification email. Please try again.');
                return;
            }
            setEmailNotice('Verification email requested. Check your inbox and spam folder.');
        } catch {
            setEmailError('Unable to request the email. Check your connection and try again.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    // Validation states
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Client-side validation
    const emailValid = emailAddress.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
    const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
    const formValid = emailAddress.length > 0 && passwordValid && emailValid;

    const handleSubmit = async () => {
        if (!formValid || fetchStatus === 'fetching') return;
        setEmailError('');
        setEmailNotice('');
        // A previous visit may have left an unfinished signup in Clerk.
        const { error: resetError } = await signUp.reset();
        if (resetError) {
            setEmailError(resetError.message);
            return;
        }

        const { error } = await signUp.password({
            emailAddress: emailAddress.trim(),
            password,
        });

        if (error) {
            // Clerk exposes validation feedback through errors.fields below.
            posthog?.capture('user_sign_up_failed', {
                error_message: error.message,
            });
            return;
        }

        // Send verification email
        setStep('verification');
        await sendVerificationEmail();
    };

    const handleVerify = async () => {
        await signUp.verifications.verifyEmailCode({
            code,
        });

        if (signUp.status === 'complete') {
            await signUp.finalize({
                navigate: ({ session, decorateUrl }) => {
                    if (session?.currentTask) {
                        console.log(session?.currentTask);
                        return;
                    }

                    posthog?.identify(emailAddress, {
                        $set: { email: emailAddress },
                        $set_once: { sign_up_date: new Date().toISOString() },
                    });
                    posthog?.capture('user_signed_up', { email: emailAddress });

                    const url = decorateUrl('/(tabs)');
                    if (url.startsWith('http')) {
                        // Only use window.location on web platform
                        if (typeof window !== 'undefined' && window.location) {
                            window.location.href = url;
                        } else {
                            // On native, just use router navigation
                            router.replace('/(tabs)' as Href);
                        }
                    } else {
                        router.replace(url as Href);
                    }
                },
            });
        } else {
            console.error('Sign-up attempt not complete:', signUp);
        }
    };

    // Don't show anything if already signed in or sign-up is complete
    if (signUp.status === 'complete' || isSignedIn) {
        return null;
    }

    // Show verification screen if email needs verification
    if (
        step === 'verification' &&
        signUp.status === 'missing_requirements' &&
        signUp.unverifiedFields.includes('email_address') &&
        signUp.missingFields.length === 0
    ) {
        return (
            <SafeAreaView className="auth-safe-area">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="auth-screen"
                >
                    <ScrollView
                        className="auth-scroll"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="auth-content">
                            {/* Branding */}
                            <View className="auth-brand-block">
                                <View className="auth-logo-wrap">
                                    <View className="auth-logo-mark">
                                        <Text className="auth-logo-mark-text">R</Text>
                                    </View>
                                    <View>
                                        <Text className="auth-wordmark">Recurrly</Text>
                                        <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                    </View>
                                </View>
                                <Text className="auth-title">Verify your email</Text>
                                <Text className="auth-subtitle">
                                    Verify your email address: {verificationEmail || 'No email address available'}
                                </Text>
                            </View>

                            {/* Verification Form */}
                            <View className="auth-card">
                                <View className="auth-form">
                                    {emailError ? <Text className="auth-error" accessibilityRole="alert">{emailError}</Text> : null}
                                    {emailNotice ? <Text className="auth-helper">{emailNotice}</Text> : null}
                                    <View className="auth-field">
                                        <Text className="auth-label">Verification Code</Text>
                                        <TextInput
                                            className="auth-input"
                                            value={code}
                                            placeholder="Enter 6-digit code"
                                            placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                            onChangeText={setCode}
                                            keyboardType="number-pad"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                        />
                                        {errors.fields.code && (
                                            <Text className="auth-error">{errors.fields.code.message}</Text>
                                        )}
                                    </View>

                                    <Pressable
                                        className={`auth-button ${(!code || fetchStatus === 'fetching') && 'auth-button-disabled'}`}
                                        onPress={handleVerify}
                                        disabled={!code || fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-button-text">
                                            {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify Email'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        className="auth-secondary-button"
                                        onPress={sendVerificationEmail}
                                        disabled={isSendingEmail || fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-secondary-button-text">{isSendingEmail ? 'Sending...' : 'Resend Code'}</Text>
                                    </Pressable>
                                    <Pressable
                                        className="auth-secondary-button"
                                        disabled={isSendingEmail || fetchStatus === 'fetching'}
                                        onPress={async () => {
                                            const { error } = await signUp.reset();
                                            if (error) {
                                                setEmailError(error.message);
                                                return;
                                            }
                                            setStep('details');
                                            setEmailAddress('');
                                            setEmailTouched(false);
                                            setCode('');
                                            setEmailError('');
                                            setEmailNotice('');
                                            setPassword('');
                                            setPasswordTouched(false);
                                        }}
                                    >
                                        <Text className="auth-secondary-button-text">Use a different email</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Main sign-up form
    return (
        <SafeAreaView className="auth-safe-area">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="auth-screen"
            >
                <ScrollView
                    className="auth-scroll"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="auth-content">
                        {/* Branding */}
                        <View className="auth-brand-block">
                            <View className="auth-logo-wrap">
                                <View className="auth-logo-mark">
                                    <Text className="auth-logo-mark-text">R</Text>
                                </View>
                                <View>
                                    <Text className="auth-wordmark">Recurrly</Text>
                                    <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                </View>
                            </View>
                            <Text className="auth-title">Create your account</Text>
                            <Text className="auth-subtitle">
                                Start tracking your subscriptions and never miss a payment
                            </Text>
                        </View>

                        {/* Sign-Up Form */}
                        <View className="auth-card">
                            <View className="auth-form">
                                {emailError ? <Text className="auth-error" accessibilityRole="alert">{emailError}</Text> : null}
                                <View className="auth-field">
                                    <Text className="auth-label">Email Address</Text>
                                    <TextInput
                                        className={`auth-input ${emailTouched && !emailValid && 'auth-input-error'}`}
                                        autoCapitalize="none"
                                        value={emailAddress}
                                        placeholder="name@example.com"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        onChangeText={setEmailAddress}
                                        onBlur={() => setEmailTouched(true)}
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                    {emailTouched && !emailValid && (
                                        <Text className="auth-error">Please enter a valid email address</Text>
                                    )}
                                    {errors.fields.emailAddress && (
                                        <Text className="auth-error">{errors.fields.emailAddress.message}</Text>
                                    )}
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Password</Text>
                                    <TextInput
                                        className={`auth-input ${passwordTouched && !passwordValid && 'auth-input-error'}`}
                                        value={password}
                                        placeholder="Create a strong password"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        secureTextEntry
                                        onChangeText={setPassword}
                                        onBlur={() => setPasswordTouched(true)}
                                        autoComplete="password-new"
                                    />
                                    {passwordTouched && !passwordValid && (
                                        <Text className="auth-error">Password must be at least {MIN_PASSWORD_LENGTH} characters</Text>
                                    )}
                                    {errors.fields.password && (
                                        <Text className="auth-error">{errors.fields.password.message}</Text>
                                    )}
                                    {!passwordTouched && (
                                        <Text className="auth-helper">Minimum {MIN_PASSWORD_LENGTH} characters required</Text>
                                    )}
                                </View>

                                <Pressable
                                    className={`auth-button ${(!formValid || fetchStatus === 'fetching') && 'auth-button-disabled'}`}
                                    onPress={handleSubmit}
                                    disabled={!formValid || fetchStatus === 'fetching'}
                                >
                                    <Text className="auth-button-text">
                                        {fetchStatus === 'fetching' ? 'Creating Account...' : 'Create Account'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Sign-In Link */}
                        <View className="auth-link-row">
                            <Text className="auth-link-copy">Already have an account?</Text>
                            <Link href="/(auth)/sign-in" asChild>
                                <Pressable>
                                    <Text className="auth-link">Sign In</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* Required for Clerk's bot protection */}
                        <View nativeID="clerk-captcha" />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignUp;
