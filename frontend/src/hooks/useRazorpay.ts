'use client';

import { useCallback, useState } from 'react';
import { paymentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UseRazorpayOptions {
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
}

export function useRazorpay({ onSuccess, onFailure }: UseRazorpayOptions = {}) {
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const openCheckout = useCallback(
    async (orderData: {
      orderId: string;
      amount: number;
      amountInr: number;
      currency: string;
      keyId: string;
      prefill?: { name?: string; email?: string; contact?: string };
      description?: string;
    }) => {
      if (!window.Razorpay) {
        toast.error('Payment gateway is loading. Please try again.');
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Kareer Studio',
        description: orderData.description || 'Service Payment',
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setVerifyingPayment(true);
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success('Payment successful!');
              onSuccess?.(verifyRes.data.data);
            } else {
              toast.error('Payment verification failed');
              onFailure?.(verifyRes.data);
            }
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Payment verification failed');
            onFailure?.(err);
          } finally {
            setVerifyingPayment(false);
          }
        },
        prefill: orderData.prefill || {},
        theme: {
          color: '#2959ba',
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description || 'Payment failed');
        onFailure?.(response.error);
      });
      rzp.open();
    },
    [onSuccess, onFailure]
  );

  return { openCheckout, verifyingPayment };
}
