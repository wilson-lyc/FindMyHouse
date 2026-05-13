import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import ElementPlusX from 'vue-element-plus-x';
import App from './App.vue';
import './styles.css';

createApp(App).use(ElementPlus).use(ElementPlusX).mount('#app');
