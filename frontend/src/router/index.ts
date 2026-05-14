import { createRouter, createWebHistory } from 'vue-router';
import { fetchLocations } from '../api/location/location-api';
import MapView from '../views/map/MapView.vue';
import WelcomePage from '../views/welcome/WelcomePage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MapView
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: WelcomePage
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

  if (hasFocus && to.name === 'welcome') {
    return { name: 'home' };
  }

  if (!hasFocus && to.name !== 'welcome') {
    return { name: 'welcome' };
  }
});

export default router;
