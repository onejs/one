use tauri::{Manager, Window};
use window_vibrancy::*;

#[tauri::command]
fn set_vibrancy(window: Window, is_dark_mode: bool) {
    #[cfg(target_os = "macos")]
    {
        let material = if is_dark_mode {
            NSVisualEffectMaterial::UltraDark
        } else {
            NSVisualEffectMaterial::UnderWindowBackground
        };

        apply_vibrancy(&window, material, None, None).expect("Failed to apply vibrancy");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    builder
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("a new app instance was opened with {args:?}");
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_vibrancy])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
