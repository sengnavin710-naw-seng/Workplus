#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Future user-visible native capabilities belong in dedicated Rust modules.
    // Do not add collection behavior without corresponding permissions and UI status.
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Workforce Platform agent");
}
