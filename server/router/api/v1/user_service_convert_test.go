package v1

import (
	"testing"

	"github.com/stretchr/testify/require"

	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

func TestConvertUserSettingFromStore_IgnoresUnsupportedSettingKey(t *testing.T) {
	user := &store.User{Username: "alice"}

	setting := &storepb.UserSetting{
		UserId: 1,
		Key:    storepb.UserSetting_REFRESH_TOKENS,
		Value: &storepb.UserSetting_RefreshTokens{
			RefreshTokens: &storepb.RefreshTokensUserSetting{},
		},
	}

	result := convertUserSettingFromStore(setting, user, setting.Key)
	require.Nil(t, result)
}

