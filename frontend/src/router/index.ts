import { createRouter, createWebHistory } from 'vue-router';
import { fetchLocations } from '../api/location/location-api';
import MainLayout from '../layouts/MainLayout.vue';
import ChatView from '../views/chat/ChatView.vue';
import HousesView from '../views/houses/HousesView.vue';
import LocationsView from '../views/locations/LocationsView.vue';
import StatsView from '../views/stats/StatsView.vue';
import HelpPage from '../views/help/HelpPage.vue';
import SettingsView from '../views/settings/SettingsView.vue';
import WelcomePage from '../views/welcome/WelcomePage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainLayout,
    redirect: { name: 'houses' },
    children: [
      {
        path: 'houses',
        name: 'houses',
        component: HousesView
      },
      {
        path: 'locations',
        name: 'locations',
        component: LocationsView
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatView
      }
    ]
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: WelcomePage
  },
  {
    path: '/help',
    name: 'help',
    component: HelpPage
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView
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

  if (!hasFocus && to.name !== 'welcome' && to.name !== 'settings' && to.name !== 'help' && to.name !== 'stats') {
    return { name: 'welcome' };
  }
});

export default router;
