package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stream
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.LiveGreen
import com.example.ui.theme.PrimaryOrange
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

enum class TournamentTab(val title: String, val icon: ImageVector) {
    OVERVIEW("Турнир", Icons.Default.MilitaryTech),
    COMPLEXES("Комплексы", Icons.Default.FitnessCenter),
    LEADERBOARD("Таблица", Icons.Default.Leaderboard),
    SCHEDULE("График", Icons.Default.CalendarMonth),
    FEED("Лента", Icons.Default.Stream),
    CABINET("Кабинет", Icons.Default.Person)
}

@Composable
fun TournamentTopBar(
    currentTitle: String,
    onSearchClick: () -> Unit = {},
    onNotificationClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(SurfaceCard.copy(alpha = 0.95f))
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left Title + Live Pill
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(LiveGreen.copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(LiveGreen)
                        )
                        Text(
                            text = "LIVE",
                            color = LiveGreen,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    }

                    Text(
                        text = "ИГРЫ ГТО 2026",
                        color = PrimaryOrange,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Text(
                    text = currentTitle,
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }

            // Right Actions
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                IconButton(
                    onClick = onSearchClick,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("topbar_search_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Поиск",
                        tint = TextSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Box(contentAlignment = Alignment.TopEnd) {
                    IconButton(
                        onClick = onNotificationClick,
                        modifier = Modifier
                            .size(40.dp)
                            .testTag("topbar_notifications_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Уведомления",
                            tint = TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Box(
                        modifier = Modifier
                            .padding(top = 8.dp, end = 8.dp)
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(PrimaryOrange)
                    )
                }

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .padding(start = 4.dp)
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(PrimaryOrange)
                        .clickable { onProfileClick() }
                        .testTag("topbar_profile_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Кабинет участника",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun TournamentBottomNav(
    currentTab: TournamentTab,
    onTabSelected: (TournamentTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val tabs = listOf(
        TournamentTab.OVERVIEW,
        TournamentTab.COMPLEXES,
        TournamentTab.LEADERBOARD,
        TournamentTab.SCHEDULE,
        TournamentTab.FEED
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(SurfaceCard.copy(alpha = 0.95f))
            .navigationBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp)
                .padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEach { tab ->
                val selected = currentTab == tab
                val tintColor = if (selected) PrimaryOrange else TextSecondary

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onTabSelected(tab) }
                        .padding(vertical = 4.dp)
                        .testTag("bottom_nav_${tab.name.lowercase()}")
                ) {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.title,
                        tint = tintColor,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = tab.title,
                        color = tintColor,
                        fontSize = 10.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
