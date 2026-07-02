'use client';

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export function ProductTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      const hasCompletedTour = localStorage.getItem('denthive_tour_completed');
      if (!hasCompletedTour) {
        // Add a slight delay so the UI fully renders before starting the tour
        setTimeout(() => setRun(true), 1000);
      }
    }
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome to DentHive! 🎉',
      content: 'Let\'s take a quick 1-minute tour of your new clinic OS to get you familiar with all the powerful features.',
      disableBeacon: true,
    },
    {
      target: '#tour-patients',
      placement: 'right',
      title: 'Patients & Journeys',
      content: 'Add new patients here and track their entire treatment journey and history.',
    },
    {
      target: '#tour-appointments',
      placement: 'right',
      title: 'Smart Calendar',
      content: 'Your conflict-free scheduling engine lives here. Manage your day efficiently.',
    },
    {
      target: '#tour-settings',
      placement: 'right',
      title: 'Role-Based Access (Staff)',
      content: 'In Settings, you can manage your Staff. Staff members only see what they need to, protecting your sensitive revenue data.',
    },
    {
      target: '#tour-revenue-recovery',
      placement: 'right',
      title: 'Stalled Journeys',
      content: 'Never lose a patient again! This feature tracks stalled treatments so you can automatically follow up and recover lost revenue.',
    },
    {
      target: '#tour-billing',
      placement: 'right',
      title: 'UPI Billing & Subscriptions',
      content: 'Generate instant UPI QR codes for your patients! Also, manage your DentHive subscription here. We offer two payment models: Standard (₹2,999/mo) and BYOS (Bring Your Own WhatsApp - ₹1,999/mo).',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('denthive_tour_completed', 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#4f46e5', // Indigo-600 to match DentHive branding
          textColor: '#0f172a',    // Slate-900
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '8px',
        },
        buttonBack: {
          marginRight: 10,
        },
      }}
    />
  );
}
