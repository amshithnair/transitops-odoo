"""
Tests for Auth router.

Covers:
  - Register happy path
  - Register conflict (duplicate email)
  - Login happy path
  - Login invalid credentials
  - Get current profile (/auth/me) with valid token
  - Rejection with invalid/missing token
"""

import pytest

from app.models import UserRole


def test_register_success(client):
    payload = {
        "name": "New Manager",
        "email": "newmanager@transitops.com",
        "password": "strongpassword",
        "role": "fleet_manager",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Manager"
    assert data["email"] == "newmanager@transitops.com"
    assert data["role"] == "fleet_manager"
    assert "id" in data
    assert "hashed_password" not in data


def test_register_duplicate_email(client, test_users):
    # Manager email already seeded in test_users
    payload = {
        "name": "Duplicate User",
        "email": "manager@transitops.com",
        "password": "password123",
        "role": "driver",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_login_success(client, test_users):
    payload = {
        "email": "manager@transitops.com",
        "password": "password123",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, test_users):
    payload = {
        "email": "manager@transitops.com",
        "password": "wrongpassword",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_me_success(client, test_users, manager_headers):
    response = client.get("/auth/me", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "manager@transitops.com"
    assert data["role"] == "fleet_manager"


def test_get_me_unauthorized(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
