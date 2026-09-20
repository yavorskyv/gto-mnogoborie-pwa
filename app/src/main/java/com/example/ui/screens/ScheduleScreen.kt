package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sports
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.LaneHeat
import com.example.data.ScheduleEntry
import com.example.data.TournamentDataRepository
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.GoldMedal
import com.example.ui.theme.LiveGreen
import com.example.ui.theme.PrimaryOrange
import com.example.ui.theme.SecondaryContainer
import com.example.ui.theme.SurfaceBase
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.SurfaceContainer
import com.example.ui.theme.SurfaceContainerHigh
import com.example.ui.theme.SurfaceElevated
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun ScheduleScreen(
    onShowMessageDialog: (title: String, message: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedVenueFilterIndex by remember { mutableIntStateOf(0) }
    val venueFilters = listOf(
        "Все площадки",
        "Арена ГТО (Помосты 1-4)",
        "Водный сектор",
        "Легкоатлетический манеж"
    )

    var athleteSearch by remember { mutableStateOf("") }

    val filteredSchedule = remember(selectedVenueFilterIndex, athleteSearch) {
        TournamentDataRepository.schedule.filter { entry ->
            val matchesVenue = when (selectedVenueFilterIndex) {
                1 -> entry.venue.contains("Арена ГТО")
                2 -> entry.venue.contains("Водный") || entry.venue.contains("Новик")
                3 -> entry.venue.contains("Стадион") || entry.venue.contains("манеж")
                else -> true
            }
            val matchesSearch = if (athleteSearch.isBlank()) true else {
                entry.title.contains(athleteSearch, ignoreCase = true) ||
                        entry.description.contains(athleteSearch, ignoreCase = true) ||
                        entry.lanes.any { it.athletes.contains(athleteSearch, ignoreCase = true) || it.region.contains(athleteSearch, ignoreCase = true) }
            }
            matchesVenue && matchesSearch
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(SurfaceBase)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Section Header
        item {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "31 АВГУСТА — ДЕНЬ 1",
                    color = PrimaryOrange,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "Расписание & Заходы",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        // Venue Filter Chips
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(venueFilters.indices.toList()) { index ->
                    val isSelected = selectedVenueFilterIndex == index
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isSelected) PrimaryOrange else SurfaceCard)
                            .border(1.dp, if (isSelected) PrimaryOrange else BorderSubtle, RoundedCornerShape(10.dp))
                            .clickable { selectedVenueFilterIndex = index }
                            .padding(horizontal = 12.dp, vertical = 7.dp)
                            .testTag("schedule_venue_chip_$index")
                    ) {
                        Text(
                            text = venueFilters[index],
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        // Athlete Heat Search
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceCard)
                    .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Поиск захода",
                    tint = TextMuted,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextField(
                    value = athleteSearch,
                    onValueChange = { athleteSearch = it },
                    placeholder = {
                        Text(
                            text = "Поиск захода по фамилии атлета или региону...",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth().testTag("schedule_search_input")
                )
            }
        }

        // Timeline of Heats
        items(filteredSchedule) { entry ->
            ScheduleEntryCard(
                entry = entry,
                onShowMessageDialog = onShowMessageDialog
            )
        }
    }
}

@Composable
fun ScheduleEntryCard(
    entry: ScheduleEntry,
    onShowMessageDialog: (title: String, message: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.isLive) SurfaceCard else SurfaceCard
        ),
        modifier = modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (entry.isLive) LiveGreen.copy(alpha = 0.6f) else BorderSubtle,
                RoundedCornerShape(16.dp)
            )
            .testTag("schedule_card_${entry.id}")
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Time and Status Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        tint = if (entry.isLive) LiveGreen else PrimaryOrange,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = entry.timeRange,
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Status Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            when {
                                entry.isLive -> LiveGreen.copy(alpha = 0.2f)
                                entry.status.contains("ЧЕРЕЗ") -> PrimaryOrange.copy(alpha = 0.15f)
                                else -> SurfaceElevated
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    if (entry.isLive) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(LiveGreen)
                        )
                    }
                    Text(
                        text = entry.status,
                        color = when {
                            entry.isLive -> LiveGreen
                            entry.status.contains("ЧЕРЕЗ") -> PrimaryOrange
                            else -> TextSecondary
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Title & Description
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = entry.title,
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = entry.description,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }

            // Live Lanes Monitor (if Live)
            if (entry.isLive && entry.lanes.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceElevated)
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = entry.heatInfo,
                            color = LiveGreen,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "ТАЙМ-КАП: ${entry.timeCap}",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Lanes List
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        entry.lanes.forEach { lane ->
                            LaneItemRow(lane = lane)
                        }
                    }

                    Button(
                        onClick = {
                            onShowMessageDialog(
                                "Видеотрансляция дорожек",
                                "Подключение к 4-камерному стриму помостов Арены ГТО (Заход 4)."
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SurfaceContainerHigh),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Videocam,
                            contentDescription = null,
                            tint = TextPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Открыть видеотрансляцию дорожек",
                            color = TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Call Time Notice (if Upcoming)
            if (entry.callTime.isNotBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(SurfaceElevated)
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.HourglassTop,
                            contentDescription = null,
                            tint = PrimaryOrange,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Вызов атлетов (Call Room): ${entry.callTime}",
                            color = TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Text(
                        text = "Стартовый лист",
                        color = PrimaryOrange,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clickable {
                                onShowMessageDialog(
                                    "Стартовый лист",
                                    "Стартовый лист Комплекса 3 (Женщины/Пары) утвержден коллегией судей."
                                )
                            }
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun LaneItemRow(lane: LaneHeat) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(SurfaceContainer)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(if (lane.isLeader) GoldMedal else SurfaceContainerHigh),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = lane.laneNumber.toString(),
                    color = if (lane.isLeader) Color.Black else TextPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = lane.region,
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (lane.isLeader) {
                        Text(
                            text = "ЛИДЕР",
                            color = GoldMedal,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Text(
                    text = lane.athletes,
                    color = TextSecondary,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = lane.status,
                color = if (lane.isLeader) LiveGreen else TextPrimary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = lane.weight,
                color = TextMuted,
                fontSize = 9.sp
            )
        }
    }
}
