import { memo, useCallback, useState } from "react";
import { FlatList, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";

// data
import ApiClient from "../../../../lib/ApiClient";

// utils
import { IsEmptyString, ToastDuration, pushToast } from "../../../../lib/utils";

// types
import type { HomeNestedStack } from "../../../../screens/Home";

// expo
import * as DocumentPicker from "expo-document-picker";

// ui
import tw from "twrnc";
import ColorScheme from "../../../../lib/Theme";
import Button from "../../../design/Button";
import Separator from "../../../design/Separator";
import ParticleView from "../../../animations/Particles";

// icons
import { AntDesign, Ionicons } from "@expo/vector-icons";

// -- end import

type AddFilesNavigationProps = NativeStackScreenProps<HomeNestedStack, "AddFiles">;
const AddFiles: React.FC<AddFilesNavigationProps> = ({ route }) => {
  const { device_id_to, device_id_from, pool_kp } = route.params;
  const [files, setFiles] = useState<ApiClient.PickedFile[]>([]);
  const [CustomMsg, setCustomMsg] = useState("");
  const [OptionalMsg, setOptionalMsg] = useState(false);

  const [transferId, setTransferId] = useState<null | string>(null);

  const addFile = async () => {
    const pickedFiles = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (pickedFiles.type === "cancel") return pushToast("no files selected");
    setFiles((prev) => [pickedFiles, ...prev]);
  };

  const deleteFile = useCallback(
    (index: number) => {
      const filesCopy = [...files];
      filesCopy.splice(index, 1);
      setFiles(filesCopy);
    },
    [files]
  );

  const disabled = files.length <= 0 && IsEmptyString(CustomMsg);
  const SendAdditionalFiles = async () => {
    if (disabled || transferId === null) return pushToast("There is nothing to send");
    const CustomMsgCopy = `${CustomMsg}`;
    const transferIdCopy = `${transferId}`;

    const formData = new FormData();
    if (!IsEmptyString(CustomMsgCopy)) formData.append("custom_message", CustomMsgCopy);
    for (const [i, { uri, name, mimeType }] of files.entries())
      formData.append(`file-${i}`, { uri, name, type: mimeType } as unknown as string);

    const {
      succeed: sentSuccess,
      data: filesIds,
      reason,
    } = await ApiClient.Post(
      "/file-transfer/{transfer_id}/add_files",
      { transfer_id: transferIdCopy },
      undefined,
      formData,
      { pool_kp }
    );

    if (!sentSuccess || !filesIds || !Array.isArray(filesIds) || filesIds.length <= 0)
      return pushToast(`Failed to add files to transfer: ${reason}`, ToastDuration.LONG);
    pushToast("Successfully added to transfer");
    setFiles([]);
    setOptionalMsg(false);
    setCustomMsg("");
  };

  const CreateTransfer = async () => {
    if (disabled) return pushToast("There is nothing to send");
    const CustomMsgCopy = `${CustomMsg}`;

    const formData = new FormData();
    if (!IsEmptyString(CustomMsgCopy)) formData.append("custom_message", CustomMsgCopy);
    for (const [i, { uri, name, mimeType }] of files.entries())
      formData.append(`file-${i}`, { uri, name, type: mimeType } as unknown as string);

    const {
      succeed: createSuccess,
      data: transfer_id,
      reason,
    } = await ApiClient.Post(
      "/file-transfer?from={from}&to={to}",
      undefined,
      { from: device_id_from, to: device_id_to },
      formData,
      { pool_kp }
    );
    if (!createSuccess || typeof transfer_id !== "string")
      return pushToast("Failed to create transfer");

    if (!createSuccess) return pushToast(`Failed create transfer: ${reason}`, ToastDuration.LONG);
    pushToast("Successfully created");
    setTransferId(transfer_id);
    setFiles([]);
    setOptionalMsg(false);
    setCustomMsg("");
  };

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}>
        <View style={tw`w-5/6 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}>
          <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}] mt-1`}>
            <AntDesign name="addfile" size={20} color="black" /> Add files to transfer
          </Text>

          <Button
            parentProps={{ onPress: addFile }}
            childStyle={tw`bg-white text-[${ColorScheme.PRIMARY_CONTENT}]  border-2 border-black mx-2 mt-2 mb-1`}>
            <AntDesign name="addfile" size={18} color="black" /> Add File
          </Button>
          <Button
            parentProps={{
              onPress: transferId === null ? CreateTransfer : SendAdditionalFiles,
              disabled,
            }}
            childStyle={tw`bg-white text-[${ColorScheme.PRIMARY_CONTENT}] ${
              disabled ? "opacity-50" : ""
            } border-2 border-black mx-2 mb-2`}>
            <Ionicons name="send-outline" size={18} color="black" /> Send File
            {files.length >= 2 ? "s" : ""}
          </Button>

          <TouchableOpacity
            onPress={() => {
              if (OptionalMsg) {
                setOptionalMsg(false);
                setCustomMsg("");
              } else setOptionalMsg(true);
            }}>
            <Text style={tw`ml-3`}>Add optional message: </Text>
            {OptionalMsg && (
              <>
                <TextInput
                  multiline
                  onChangeText={setCustomMsg}
                  value={CustomMsg}
                  style={{
                    ...tw`border-2 border-black rounded-lg h-24 mx-2 p-2`,
                    textAlignVertical: "top",
                  }}
                />
              </>
            )}
          </TouchableOpacity>

          <Separator />

          <View style={tw`max-h-60 overflow-hidden`}>
            <FlatList
              data={files}
              renderItem={({ index, item }) => (
                <File key={index} fi={item} deleteFile={() => deleteFile(index)} />
              )}
            />
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};

type FileProps = {
  fi: ApiClient.PickedFile;
  deleteFile: () => void;
};
const File: React.FC<FileProps> = memo(({ fi, deleteFile }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={tw`mx-2 p-2 border-2 border-black rounded-lg mb-2`}>
      <TouchableOpacity
        style={tw`flex flex-row items-center gap-x-2`}
        onPress={() => setOpen((prev) => !prev)}>
        <Image
          source={
            [
              require("../../../../assets/Images/box1.png"),
              require("../../../../assets/Images/box2.png"),
              require("../../../../assets/Images/box3.png"),
            ][Math.round(Math.random() * 2)]
          }
          style={tw`w-[32px] h-[32px] rounded-xl`}
        />
        <Text style={tw`font-semibold ${fi.size === undefined ? "flex-1" : ""}`}>
          {fi.name.length <= 17 ? fi.name : `${fi.name.slice(0, 18 - 3)}..`}
        </Text>
        {fi.size && (
          <>
            <Text style={tw`font-semibold`}>|</Text>
            <Text style={tw`font-semibold flex-1`}>
              {Intl.NumberFormat("en", { notation: "compact" }).format(fi.size)}B
            </Text>
          </>
        )}
        <TouchableOpacity
          style={tw`bg-white w-7 h-7 shadow-sm rounded border-2 border-black flex justify-center items-center`}
          onPress={deleteFile}>
          <AntDesign name="minussquare" size={14} color="black" />
        </TouchableOpacity>
      </TouchableOpacity>
      {open && (
        <View>
          <Text selectable>
            {"\u2022"} Filename: <Text style={tw`font-bold`}>{fi.name}</Text>
          </Text>

          {fi.size && (
            <Text selectable>
              {"\u2022"} Size:{" "}
              <Text style={tw`font-bold`}>
                {Intl.NumberFormat("en", { notation: "compact" }).format(fi.size)}B
              </Text>
            </Text>
          )}

          {fi.lastModified && (
            <Text selectable>
              {"\u2022"} Last modified:{" "}
              <Text style={tw`font-bold`}>{new Date(fi.lastModified).toLocaleDateString()}</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

export default AddFiles;
