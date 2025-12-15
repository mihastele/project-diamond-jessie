#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod http_client;
mod storage;
mod types;

use http_client::HttpClient;
use storage::Storage;
use types::*;

use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

struct AppState {
    http_client: Arc<HttpClient>,
    storage: Arc<Mutex<Storage>>,
}

#[tauri::command]
async fn send_request(
    state: State<'_, AppState>,
    request: HttpRequestPayload,
) -> Result<HttpResponsePayload, String> {
    state
        .http_client
        .send(request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_workspace(
    state: State<'_, AppState>,
    workspace: WorkspaceData,
) -> Result<(), String> {
    let mut storage = state.storage.lock().await;
    storage.save_workspace(&workspace).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_workspace(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Option<WorkspaceData>, String> {
    let storage = state.storage.lock().await;
    storage.load_workspace(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<WorkspaceMeta>, String> {
    let storage = state.storage.lock().await;
    storage.list_workspaces().map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_workspace(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<(), String> {
    let mut storage = state.storage.lock().await;
    storage.delete_workspace(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_collection(
    state: State<'_, AppState>,
    workspace_id: String,
    collection_id: String,
    format: String,
) -> Result<String, String> {
    let storage = state.storage.lock().await;
    storage
        .export_collection(&workspace_id, &collection_id, &format)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_collection(
    state: State<'_, AppState>,
    workspace_id: String,
    data: String,
    format: String,
) -> Result<CollectionData, String> {
    let mut storage = state.storage.lock().await;
    storage
        .import_collection(&workspace_id, &data, &format)
        .map_err(|e| e.to_string())
}

fn main() {
    let http_client = Arc::new(HttpClient::new());
    let storage = Arc::new(Mutex::new(Storage::new().expect("Failed to initialize storage")));

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            http_client,
            storage,
        })
        .invoke_handler(tauri::generate_handler![
            send_request,
            save_workspace,
            load_workspace,
            list_workspaces,
            delete_workspace,
            export_collection,
            import_collection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
