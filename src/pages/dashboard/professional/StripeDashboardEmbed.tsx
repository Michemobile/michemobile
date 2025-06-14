import React, { useEffect, useRef, useState } from 'react'
import { loadConnectAndInitialize } from '@stripe/connect-js'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const StripeDashboardEmbed: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [loadingState, setLoadingState] = useState<string>('Starting...')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Only initialize if not already initialized
    if (!initialized) {
      const initializeStripe = async () => {
        try {
          setLoadingState('Validating environment...')
          
          // Log current URL for debugging
          const currentUrl = window.location.href
          console.log('Current URL:', currentUrl)

          if (!containerRef.current) {
            setLoadingState('Waiting for container...')
            return; // Will retry on next render when ref is available
          }

          const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
          if (!publishableKey) {
            throw new Error('Stripe publishable key is not set')
          }

          // Test Supabase connection first
          setLoadingState('Testing Supabase connection...')
          try {
            const { error: pingError } = await supabase.from('professionals').select('count').limit(1)
            if (pingError) {
              throw new Error(`Supabase connection failed: ${pingError.message}`)
            }
          } catch (dbError: any) {
            throw new Error(`Database connection error: ${dbError.message}`)
          }

          setLoadingState('Getting user data...')
          // Get user data with error handling
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError) throw new Error(`Auth error: ${userError.message}`)
          if (!user) throw new Error('Not authenticated')

          setLoadingState('Getting professional data...')
          // Get professional data with error handling
          const { data: professional, error: profError } = await supabase
            .from('professionals')
            .select('id, stripe_account_id')
            .eq('profile_id', user.id)
            .single()

          if (profError) throw new Error(`Professional data error: ${profError.message}`)
          if (!professional) throw new Error('Professional profile not found')
          
          console.log('Professional data:', { 
            id: professional.id, 
            hasStripeAccount: !!professional.stripe_account_id,
            stripeAccountId: professional.stripe_account_id?.slice(0, 10) + '...' // Log partial for privacy
          })
          
          if (!professional.stripe_account_id) {
            throw new Error('No Stripe account connected. Please complete Stripe onboarding first.')
          }

          setLoadingState('Getting session...')
          // Get session for auth with error handling
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw new Error(`Session error: ${sessionError.message}`)
          if (!session?.access_token) throw new Error('No valid session')

          // Initialize Stripe Connect
          setLoadingState('Initializing Stripe Connect...')

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          if (!supabaseUrl) {
            throw new Error('Supabase URL not configured')
          }

          const functionUrl = `${supabaseUrl}/functions/v1/create-account-session`
          setLoadingState(`Connecting to ${functionUrl}...`)
          
          console.log('Initializing Stripe Connect with publishable key:', publishableKey?.slice(0, 10) + '...')
          
          const connect = await loadConnectAndInitialize({
            publishableKey,
            appearance: {
              variables: {
                fontFamily: '"Inter", system-ui, sans-serif',
                colorPrimary: '#B8860B',
                colorBackground: '#FFFFFF',
                borderRadius: '8px',
              }
            },
            fetchClientSecret: async () => {
              setLoadingState('Fetching client secret...')
              
              const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ 
                  professional_id: professional.id,
                  // Add timestamp to prevent caching
                  timestamp: new Date().getTime()
                })
              })

              if (!res.ok) {
                const errorText = await res.text()
                console.error('Edge Function Error:', {
                  url: functionUrl,
                  status: res.status,
                  statusText: res.statusText,
                  headers: Object.fromEntries(res.headers.entries()),
                  body: errorText,
                  requestBody: JSON.stringify({ professional_id: professional.id, timestamp: new Date().getTime() })
                })

                try {
                  const errorData = JSON.parse(errorText)
                  throw new Error(errorData.error || `Edge Function failed: ${res.status} - ${errorData.error || errorText}`)
                } catch (e) {
                  throw new Error(`Edge Function failed: ${res.status} - ${errorText}`)
                }
              }

              console.log('Edge Function response successful')
              const data = await res.json()
              console.log('Received data from Edge Function:', { hasClientSecret: !!data.client_secret })
              if (!data.client_secret) {
                console.error('Invalid response data:', data)
                throw new Error('No client secret received in response')
              }

              return data.client_secret
            }
          })

          setLoadingState('Creating components...')

          // Clear any existing content
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild)
          }

          // Create wrapper elements with explicit size
          const componentsContainer = document.createElement('div')
          componentsContainer.className = 'space-y-6 min-h-[600px]'
          componentsContainer.style.minHeight = '600px'

          try {
            // Create each component with error handling
            setLoadingState('Creating balances component...')
            const balancesContainer = document.createElement('div')
            balancesContainer.className = 'bg-white rounded-lg shadow-sm p-6 min-h-[200px]'
            balancesContainer.style.minHeight = '200px'
            const balances = connect.create('balances')
            if (!balances) throw new Error('Failed to create balances component')
            balancesContainer.appendChild(balances)
            componentsContainer.appendChild(balancesContainer)

            setLoadingState('Creating payments component...')
            const paymentsContainer = document.createElement('div')
            paymentsContainer.className = 'bg-white rounded-lg shadow-sm p-6 min-h-[200px]'
            paymentsContainer.style.minHeight = '200px'
            const payments = connect.create('payments')
            if (!payments) throw new Error('Failed to create payments component')
            paymentsContainer.appendChild(payments)
            componentsContainer.appendChild(paymentsContainer)

            setLoadingState('Creating payouts component...')
            const payoutsContainer = document.createElement('div')
            payoutsContainer.className = 'bg-white rounded-lg shadow-sm p-6 min-h-[200px]'
            payoutsContainer.style.minHeight = '200px'
            const payouts = connect.create('payouts')
            if (!payouts) throw new Error('Failed to create payouts component')
            payoutsContainer.appendChild(payouts)
            componentsContainer.appendChild(payoutsContainer)

            // Add all components to the main container
            containerRef.current.appendChild(componentsContainer)
            setLoadingState('Components mounted')
            
            // Wait a moment to ensure components are properly initialized
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            setInitialized(true)
            setLoading(false)
          } catch (err: any) {
            throw new Error(`Error creating Stripe components: ${err.message}`)
          }
        } catch (err: any) {
          const errorMessage = err.message || 'Failed to initialize dashboard'
          console.error('Dashboard initialization error:', {
            message: errorMessage,
            stack: err.stack
          })
          setError(errorMessage)
          setLoading(false)
        }
      }

      initializeStripe()
    }
  }, [initialized])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }
      }
      setInitialized(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 min-h-[400px]">
        <div className="flex items-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2"/> 
          Loading dashboard...
        </div>
        <div className="text-sm text-gray-500">
          {loadingState}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="whitespace-pre-wrap">
          Error loading dashboard: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div ref={containerRef} className="w-full space-y-6 max-w-[1200px] mx-auto p-6 min-h-[600px]" />
  )
}

export default StripeDashboardEmbed