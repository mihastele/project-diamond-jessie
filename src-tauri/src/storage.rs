use crate::types::{CollectionData, WorkspaceData, WorkspaceMeta};
use serde_json;
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Workspace not found: {0}")]
    WorkspaceNotFound(String),
    #[error("Collection not found: {0}")]
    CollectionNotFound(String),
    #[error("Invalid format: {0}")]
    InvalidFormat(String),
}

pub struct Storage {
    data_dir: PathBuf,
}

impl Storage {
    pub fn new() -> Result<Self, StorageError> {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("diamond");

        fs::create_dir_all(&data_dir)?;
        fs::create_dir_all(data_dir.join("workspaces"))?;

        Ok(Self { data_dir })
    }

    fn workspace_path(&self, workspace_id: &str) -> PathBuf {
        self.data_dir
            .join("workspaces")
            .join(format!("{}.json", workspace_id))
    }

    pub fn save_workspace(&mut self, workspace: &WorkspaceData) -> Result<(), StorageError> {
        let path = self.workspace_path(&workspace.id);
        let json = serde_json::to_string_pretty(workspace)?;
        fs::write(path, json)?;
        Ok(())
    }

    pub fn load_workspace(&self, workspace_id: &str) -> Result<Option<WorkspaceData>, StorageError> {
        let path = self.workspace_path(workspace_id);
        if !path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(path)?;
        let workspace: WorkspaceData = serde_json::from_str(&content)?;
        Ok(Some(workspace))
    }

    pub fn list_workspaces(&self) -> Result<Vec<WorkspaceMeta>, StorageError> {
        let workspaces_dir = self.data_dir.join("workspaces");
        let mut workspaces = Vec::new();

        if !workspaces_dir.exists() {
            return Ok(workspaces);
        }

        for entry in fs::read_dir(workspaces_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(workspace) = serde_json::from_str::<WorkspaceData>(&content) {
                        workspaces.push(WorkspaceMeta {
                            id: workspace.id,
                            name: workspace.name,
                            description: workspace.description,
                            collections_count: workspace.collections.len(),
                            environments_count: workspace.environments.len(),
                            created_at: workspace.created_at,
                            updated_at: workspace.updated_at,
                        });
                    }
                }
            }
        }

        Ok(workspaces)
    }

    pub fn delete_workspace(&mut self, workspace_id: &str) -> Result<(), StorageError> {
        let path = self.workspace_path(workspace_id);
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }

    pub fn export_collection(
        &self,
        workspace_id: &str,
        collection_id: &str,
        format: &str,
    ) -> Result<String, StorageError> {
        let workspace = self
            .load_workspace(workspace_id)?
            .ok_or_else(|| StorageError::WorkspaceNotFound(workspace_id.to_string()))?;

        let collection = workspace
            .collections
            .iter()
            .find(|c| c.id == collection_id)
            .ok_or_else(|| StorageError::CollectionNotFound(collection_id.to_string()))?;

        match format.to_lowercase().as_str() {
            "json" | "diamond" => {
                Ok(serde_json::to_string_pretty(collection)?)
            }
            "postman" => {
                let postman = convert_to_postman(collection);
                Ok(serde_json::to_string_pretty(&postman)?)
            }
            _ => Err(StorageError::InvalidFormat(format.to_string())),
        }
    }

    pub fn import_collection(
        &mut self,
        workspace_id: &str,
        data: &str,
        format: &str,
    ) -> Result<CollectionData, StorageError> {
        let collection: CollectionData = match format.to_lowercase().as_str() {
            "json" | "diamond" => serde_json::from_str(data)?,
            "postman" => convert_from_postman(data)?,
            _ => return Err(StorageError::InvalidFormat(format.to_string())),
        };

        let mut workspace = self
            .load_workspace(workspace_id)?
            .ok_or_else(|| StorageError::WorkspaceNotFound(workspace_id.to_string()))?;

        workspace.collections.push(collection.clone());
        workspace.updated_at = chrono::Utc::now().timestamp_millis();
        self.save_workspace(&workspace)?;

        Ok(collection)
    }
}

fn convert_to_postman(collection: &CollectionData) -> serde_json::Value {
    serde_json::json!({
        "info": {
            "_postman_id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": collection.items.iter().map(|item| {
            serde_json::json!({
                "name": item.name,
                "request": item.request.as_ref().map(|req| {
                    serde_json::json!({
                        "method": req.method,
                        "header": req.headers.iter().map(|h| {
                            serde_json::json!({
                                "key": h.key,
                                "value": h.value,
                                "disabled": !h.enabled
                            })
                        }).collect::<Vec<_>>(),
                        "url": {
                            "raw": req.url
                        },
                        "body": {
                            "mode": req.body.body_type,
                            "raw": req.body.raw
                        }
                    })
                })
            })
        }).collect::<Vec<_>>()
    })
}

fn convert_from_postman(data: &str) -> Result<CollectionData, StorageError> {
    let postman: serde_json::Value = serde_json::from_str(data)?;
    
    let info = postman.get("info").ok_or_else(|| {
        StorageError::InvalidFormat("Missing 'info' field in Postman collection".to_string())
    })?;

    let id = info
        .get("_postman_id")
        .and_then(|v| v.as_str())
        .unwrap_or(&uuid::Uuid::new_v4().to_string())
        .to_string();

    let name = info
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Imported Collection")
        .to_string();

    let description = info.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());

    let now = chrono::Utc::now().timestamp_millis();

    Ok(CollectionData {
        id,
        name,
        description,
        items: Vec::new(),
        variables: None,
        auth: None,
        pre_request_script: None,
        test_script: None,
        tags: None,
        created_at: now,
        updated_at: now,
    })
}
