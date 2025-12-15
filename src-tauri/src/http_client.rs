use crate::types::{HttpRequestPayload, HttpResponsePayload, TimingInfo};
use reqwest::{Client, Method, redirect::Policy};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum HttpError {
    #[error("Request failed: {0}")]
    RequestFailed(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    #[error("Invalid method: {0}")]
    InvalidMethod(String),
    #[error("Timeout")]
    Timeout,
    #[error("Connection error: {0}")]
    ConnectionError(String),
}

pub struct HttpClient;

impl HttpClient {
    pub fn new() -> Self {
        Self
    }

    pub async fn send(&self, payload: HttpRequestPayload) -> Result<HttpResponsePayload, HttpError> {
        let method = match payload.method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "PATCH" => Method::PATCH,
            "DELETE" => Method::DELETE,
            "OPTIONS" => Method::OPTIONS,
            "HEAD" => Method::HEAD,
            _ => return Err(HttpError::InvalidMethod(payload.method)),
        };

        let timeout = payload.timeout_ms.unwrap_or(30000);
        let follow_redirects = payload.follow_redirects.unwrap_or(true);
        let validate_ssl = payload.validate_ssl.unwrap_or(true);

        let client = Client::builder()
            .timeout(Duration::from_millis(timeout))
            .redirect(if follow_redirects {
                Policy::limited(10)
            } else {
                Policy::none()
            })
            .danger_accept_invalid_certs(!validate_ssl)
            .build()
            .map_err(|e| HttpError::RequestFailed(e.to_string()))?;
        let url = reqwest::Url::parse(&payload.url)
            .map_err(|e| HttpError::InvalidUrl(e.to_string()))?;
        let mut request = client.request(method, url);

        for (key, value) in &payload.headers {
            request = request.header(key, value);
        }

        if let Some(body) = &payload.body {
            request = request.body(body.clone());
        }

        let start_time = Instant::now();

        let response = request
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    HttpError::Timeout
                } else if e.is_connect() {
                    HttpError::ConnectionError(e.to_string())
                } else {
                    HttpError::RequestFailed(e.to_string())
                }
            })?;

        let status = response.status().as_u16();
        let status_text = response
            .status()
            .canonical_reason()
            .unwrap_or("Unknown")
            .to_string();

        let mut headers = HashMap::new();
        for (key, value) in response.headers() {
            if let Ok(v) = value.to_str() {
                headers.insert(key.to_string(), v.to_string());
            }
        }

        let body = response
            .text()
            .await
            .map_err(|e| HttpError::RequestFailed(e.to_string()))?;

        let total_time = start_time.elapsed().as_millis() as f64;
        let body_size = body.len();

        Ok(HttpResponsePayload {
            status,
            status_text,
            headers,
            body,
            body_size,
            timing: TimingInfo {
                dns: 0.0,
                connect: 0.0,
                tls: 0.0,
                send: 0.0,
                wait: total_time,
                receive: 0.0,
                total: total_time,
            },
            timestamp: chrono::Utc::now().timestamp_millis(),
        })
    }
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}
