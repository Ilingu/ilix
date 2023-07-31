import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { FlatList, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParticleView from "../../animations/Particles";
import tw from "twrnc";
import { useContext } from "react";
import PoolContext from "../../../lib/Context/Pool";
import { StoredDevicesPool } from "../../../lib/types/interfaces";
import ColorScheme from "../../../lib/Theme";
import { AntDesign } from "@expo/vector-icons";
import Button from "../../design/Button";
import { pushToast } from "../../../lib/utils";
import Separator from "../../design/Separator";

type PoolSettingsNavigationProps = NativeStackScreenProps<HomeNestedStack, "PoolSettings">;
const PoolSettings: React.FC<PoolSettingsNavigationProps> = ({ navigation }) => {
  const { pools, setPool, leavePool } = useContext(PoolContext);

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}>
        <View style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}>
          <View style={tw`flex flex-row justify-center items-center gap-x-1`}>
            <AntDesign
              name="setting"
              size={16}
              color="black"
              style={{ transform: [{ translateY: 3 }] } as ViewStyle}
            />
            <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}] mt-1`}>
              Pools settings
            </Text>
          </View>

          <Separator />

          <View style={tw`max-h-60 overflow-hidden`}>
            <FlatList
              data={pools?.pools}
              renderItem={({ index, item }) => (
                <Pool
                  key={index}
                  is_current={index === pools?.current_index}
                  pool_data={item}
                  Switch={async () => {
                    if (index === pools?.current_index || setPool === undefined)
                      return pushToast(`Failed to switch pool`);

                    const { succeed } = await setPool(index);
                    if (succeed) pushToast(`Current pool set to: ${item.pool_name}`);
                    else pushToast(`Failed to switch pool`);
                  }}
                  Leave={async () => {
                    if (leavePool === undefined) return pushToast(`Failed to leave pool`);

                    const { succeed } = await leavePool(index);
                    if (succeed) pushToast("Pool left successfully");
                    else pushToast(`Failed to leave pool`);
                  }}
                  openQrcode={() => navigation.push("JoinLink", { pool: { ...item } })}
                />
              )}
            />
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default PoolSettings;

type PoolProps = {
  pool_data: StoredDevicesPool;
  is_current: boolean;
  Switch: () => void;
  Leave: () => void;
  openQrcode: () => void;
};
const Pool: React.FC<PoolProps> = ({ pool_data, is_current, Switch, Leave, openQrcode }) => {
  return (
    <View style={tw`flex flex-row gap-x-1 items-center mb-2 mx-2`}>
      <Button
        parentProps={{
          style: tw`grow-1`,
          disabled: is_current,
          onPress: !is_current ? Switch : undefined,
        }}
        childStyle={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white font-semibold`}
        childProps={{ selectable: true }}>
        {is_current && <Text style={tw`italic text-amber-400`}>{">>> "}</Text>}
        <Text
          style={{
            fontFamily: "monospace",
          }}>
          {pool_data.pool_name}
        </Text>
        {is_current && <Text style={tw`italic text-amber-400`}>{" <<<"}</Text>}
      </Button>
      <TouchableOpacity
        onPress={Leave}
        style={tw`bg-white w-10 h-10 shadow-sm rounded border-2 border-black flex justify-center items-center`}>
        <AntDesign name="minussquare" size={20} color="black" />
      </TouchableOpacity>
      <TouchableOpacity
        style={tw`bg-white w-10 h-10 shadow-sm rounded border-2 border-black flex justify-center items-center`}
        onPress={openQrcode}>
        <AntDesign name="qrcode" size={20} color="black" />
      </TouchableOpacity>
    </View>
  );
};
