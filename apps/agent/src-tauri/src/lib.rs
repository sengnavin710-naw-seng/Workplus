use keyring::Entry;
use serde::Serialize;

const CREDENTIAL_SERVICE: &str = "com.workplus.agent";
const CREDENTIAL_USER: &str = "device-credential";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceIdentity {
    device_name: String,
    platform: &'static str,
    os_version: String,
    agent_version: &'static str,
}

#[tauri::command]
fn get_device_identity() -> DeviceIdentity {
    DeviceIdentity {
        device_name: std::env::var("COMPUTERNAME")
            .or_else(|_| std::env::var("HOSTNAME"))
            .unwrap_or_else(|_| "Personal computer".to_string()),
        platform: if cfg!(target_os = "windows") {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else {
            "linux"
        },
        os_version: std::env::consts::OS.to_string(),
        agent_version: env!("CARGO_PKG_VERSION"),
    }
}

#[tauri::command]
fn open_authorization_url(value: String) -> Result<(), String> {
    let parsed = url::Url::parse(&value).map_err(|_| "Invalid authorization URL")?;
    let is_local_http = parsed.scheme() == "http" && parsed.host_str() == Some("localhost");
    if (parsed.scheme() != "https" && !is_local_http) || parsed.path() != "/agent/connect" {
        return Err("Authorization URL is not allowed".to_string());
    }
    open::that_detached(parsed.as_str()).map_err(|_| "Could not open the browser".to_string())
}

fn credential_entry() -> Result<Entry, String> {
    Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .map_err(|_| "Windows Credential Manager is unavailable".to_string())
}

#[tauri::command]
fn store_device_credential(value: String) -> Result<(), String> {
    if !value.starts_with("wpd_") || value.len() < 32 {
        return Err("Invalid device credential".to_string());
    }
    credential_entry()?
        .set_password(&value)
        .map_err(|_| "Device credential could not be stored".to_string())
}

#[tauri::command]
fn load_device_credential() -> Result<Option<String>, String> {
    match credential_entry()?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Device credential could not be loaded".to_string()),
    }
}

#[tauri::command]
fn delete_device_credential() -> Result<(), String> {
    match credential_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Device credential could not be removed".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Future user-visible native capabilities belong in dedicated Rust modules.
    // Do not add collection behavior without corresponding permissions and UI status.
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            delete_device_credential,
            get_device_identity,
            load_device_credential,
            open_authorization_url,
            store_device_credential,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Workforce Platform agent");
}
