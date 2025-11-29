package config

import (
	"os"
	"strconv"
	"time"
)

// Config represents application configuration
type Config struct {
	Server     ServerConfig
	Redis      RedisConfig
	PostgreSQL PostgreSQLConfig
	Game       GameConfig
	WebSocket  WebSocketConfig
	Log        LogConfig
}

// ServerConfig represents server configuration
type ServerConfig struct {
	Port int
	Host string
}

// RedisConfig represents Redis configuration
type RedisConfig struct {
	Host            string
	Port            int
	Password        string
	DB              int
	MaxRetries      int
	PoolSize        int
	EnableAOF       bool
	AOFFsync        string
	EnableRDB       bool
	RDBSaveInterval int
}

// PostgreSQLConfig represents PostgreSQL configuration
type PostgreSQLConfig struct {
	Host                  string
	Port                  int
	User                  string
	Password              string
	Database              string
	SSLMode               string
	MaxConnections        int
	MaxIdleConnections    int
	ConnectionMaxLifetime time.Duration
}

// GameConfig represents game-specific configuration
type GameConfig struct {
	MaxSessions     int
	SessionTimeout  time.Duration
	CleanupInterval time.Duration
}

// WebSocketConfig represents WebSocket configuration
type WebSocketConfig struct {
	ReadBufferSize  int
	WriteBufferSize int
	WriteDeadline   time.Duration
}

// LogConfig represents logging configuration
type LogConfig struct {
	Level  string
	Format string
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnvAsInt("PORT", 8080),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Redis: RedisConfig{
			Host:            getEnv("REDIS_HOST", "localhost"),
			Port:            getEnvAsInt("REDIS_PORT", 6379),
			Password:        getEnv("REDIS_PASSWORD", ""),
			DB:              getEnvAsInt("REDIS_DB", 0),
			MaxRetries:      getEnvAsInt("REDIS_MAX_RETRIES", 3),
			PoolSize:        getEnvAsInt("REDIS_POOL_SIZE", 10),
			EnableAOF:       getEnvAsBool("REDIS_ENABLE_AOF", true),
			AOFFsync:        getEnv("REDIS_AOF_FSYNC", "everysec"),
			EnableRDB:       getEnvAsBool("REDIS_ENABLE_RDB", true),
			RDBSaveInterval: getEnvAsInt("REDIS_RDB_SAVE_INTERVAL", 900),
		},
		PostgreSQL: PostgreSQLConfig{
			Host:                  getEnv("POSTGRES_HOST", "localhost"),
			Port:                  getEnvAsInt("POSTGRES_PORT", 5432),
			User:                  getEnv("POSTGRES_USER", "golem_user"),
			Password:              getEnv("POSTGRES_PASSWORD", "golem_password"),
			Database:              getEnv("POSTGRES_DB", "golem_db"),
			SSLMode:               getEnv("POSTGRES_SSL_MODE", "disable"),
			MaxConnections:        getEnvAsInt("POSTGRES_MAX_CONNECTIONS", 20),
			MaxIdleConnections:    getEnvAsInt("POSTGRES_MAX_IDLE_CONNECTIONS", 5),
			ConnectionMaxLifetime: time.Duration(getEnvAsInt("POSTGRES_CONNECTION_MAX_LIFETIME", 3600)) * time.Second,
		},
		Game: GameConfig{
			MaxSessions:     getEnvAsInt("GAME_MAX_SESSIONS", 100),
			SessionTimeout:  time.Duration(getEnvAsInt("GAME_SESSION_TIMEOUT", 3600)) * time.Second,
			CleanupInterval: time.Duration(getEnvAsInt("GAME_CLEANUP_INTERVAL", 300)) * time.Second,
		},
		WebSocket: WebSocketConfig{
			ReadBufferSize:  getEnvAsInt("WS_READ_BUFFER_SIZE", 1024),
			WriteBufferSize: getEnvAsInt("WS_WRITE_BUFFER_SIZE", 1024),
			WriteDeadline:   time.Duration(getEnvAsInt("WS_WRITE_DEADLINE", 10)) * time.Second,
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt retrieves an environment variable as an integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// getEnvAsBool retrieves an environment variable as a boolean or returns a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
