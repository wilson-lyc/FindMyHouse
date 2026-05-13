import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import ElementPlusX from 'vue-element-plus-x';
import router from './router';
import App from './App.vue';
import './styles.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.use(ElementPlusX);
app.mount('#app');
