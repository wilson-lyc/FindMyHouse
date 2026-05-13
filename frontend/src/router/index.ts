import { createRouter, createWebHistory } from 'vue-router';
import { fetchLocations } from '../api/location/location-api';
import MapView from '../views/map/MapView.vue';
import OnboardingPage from '../views/onboarding/OnboardingPage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MapView
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: OnboardingPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

async function hasFocusLocation(): Promise<boolean> {
  try {
    const locations = await fetchLocations({ category: '' });
    return locations.some((loc) => loc.isFocus);
  } catch {
    return false;
  }
}

router.beforeEach(async (to) => {
  const hasFocus = await hasFocusLocation();

  if (hasFocus && to.name === 'onboarding') {
    return { name: 'home' };
  }

  if (!hasFocus && to.name !== 'onboarding') {
    return { name: 'onboarding' };
  }
});

export default router;
