use tauri::Manager;

#[tauri::command]
fn get_backend_url() -> String {
    std::env::var("BACKEND_URL").unwrap_or_else(|_| "http://localhost:3001".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let shell = app.shell();
            let sidecar_command = shell.sidecar("backend").expect("failed to create sidecar command");

            let (mut _rx, child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

            let pid = child.pid();
            println!("Backend sidecar started with pid: {}", pid);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
